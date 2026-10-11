import { readConfig } from "./config";
import { EVENT_SCHEMA } from "./events";
import type {
	AnalyticsProvider,
	DeviceType,
	EventName,
	EventProps,
	Kind,
	LandingSource,
	SessionContext,
	TpEvents,
} from "./events";
import { REGISTRY, type ProviderOptions } from "./providers";
import { hasShareParam } from "../share-hash";
import { consent } from "../../../../lib/privacy/consent";
import { VENDORS, type CategoryId } from "../../../../lib/privacy/registry";
import { reportViolation } from "../../../../lib/privacy/violation";

const MAX_STRING_LENGTH = 64;
const MAX_QUEUE = 100;

declare global {
	interface Window {
		__tpEvents?: { event: string; props: EventProps }[];
	}
}

let startedProviders: AnalyticsProvider[] = [];
let providersAwaitingConsent: { provider: AnalyticsProvider; category: CategoryId }[] = [];
let initialized = false;
let queue: { event: EventName; props: EventProps }[] = [];

export function deviceType(): DeviceType {
	// iPadOS Safari reports itself as a Mac, but a Mac has no multi-touch screen.
	const macLike = /^Mac/i.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);
	if (macLike && navigator.maxTouchPoints > 1) return "tablet";
	if (!window.matchMedia("(pointer: coarse)").matches) return "desktop";
	const shorterSide = Math.min(window.screen.width, window.screen.height);
	return shorterSide < 600 ? "phone" : "tablet";
}

const SEARCH_HOSTS: RegExp[] = [
	/(^|\.)google\.(com?\.)?[a-z]{2,3}$/,
	/(^|\.)bing\.com$/,
	/(^|\.)duckduckgo\.com$/,
	/(^|\.)search\.yahoo\.com$/,
	/(^|\.)yandex\.(com?\.)?[a-z]{2,3}$/,
	/(^|\.)baidu\.com$/,
	/(^|\.)ecosia\.org$/,
	/(^|\.)search\.brave\.com$/,
	/(^|\.)startpage\.com$/,
	/(^|\.)kagi\.com$/,
];

export function hostnameOf(url: string): string {
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		return "";
	}
}

export function landingSource(referrer: string, hash: string): LandingSource {
	if (hasShareParam(hash)) return "share_link";
	const host = hostnameOf(referrer);
	if (host === "") return "direct";
	if (SEARCH_HOSTS.some((re) => re.test(host))) return "organic";
	if (host === location.hostname.toLowerCase()) return "direct";
	return "referral";
}

function referrerDomainOf(referrer: string): string {
	const hostname = hostnameOf(referrer);
	return hostname.length > MAX_STRING_LENGTH ? "" : hostname;
}

export function trackPageView({ referrer, hash }: { referrer: string; hash: string }): void {
	track("tp_page_view", { referrer_domain: referrerDomainOf(referrer), landing_source: landingSource(referrer, hash) });
}

function kindOf(value: unknown): Kind | undefined {
	if (typeof value === "string") return "string";
	if (typeof value === "boolean") return "boolean";
	if (typeof value === "number" && Number.isFinite(value)) return "number";
	return undefined;
}

function violationOf(event: EventName, key: string, value: unknown): string | undefined {
	const schema: Record<string, { kinds: readonly Kind[] }> = EVENT_SCHEMA[event];
	const allowedKinds = schema[key]?.kinds;
	if (!allowedKinds) return `"${key}" is not in the ${event} schema`;
	const kind = kindOf(value);
	if (!kind) return `"${key}" is not a string, number or boolean`;
	if (!allowedKinds.includes(kind)) return `"${key}" is a ${kind} but ${event} expects ${allowedKinds.join(" or ")}`;
	if (typeof value === "string" && value.length > MAX_STRING_LENGTH) {
		return `"${key}" is a string longer than ${MAX_STRING_LENGTH} chars (content leak?)`;
	}
	return undefined;
}

function sanitize(event: EventName, props: object): { clean: EventProps; violations: string[] } {
	const clean: EventProps = {};
	const violations: string[] = [];
	for (const [key, value] of Object.entries(props)) {
		const violation = violationOf(event, key, value);
		if (violation) violations.push(violation);
		else clean[key] = value;
	}
	return { clean, violations };
}

function reportWithoutThrowing(violation: string): void {
	try {
		reportViolation(violation);
	} catch (error) {
		console.error(error);
	}
}

function context(): SessionContext {
	return { device_type: deviceType() };
}

function guarded<T>(providerName: string, action: string, run: () => T): T | undefined {
	try {
		return run();
	} catch (error) {
		if (import.meta.env.DEV) console.warn(`[tp] provider "${providerName}" threw in ${action}`, error);
		return undefined;
	}
}

function dispatch(event: EventName, props: EventProps, targets: AnalyticsProvider[]): void {
	const merged: EventProps = { ...props, ...context() };
	for (const provider of targets) {
		guarded(provider.name, "track", () => provider.track(event, merged));
	}
}

function recordForInspection(event: EventName, props: EventProps): void {
	(window.__tpEvents ??= []).push({ event, props: { ...props, ...context() } });
}

function createProvider(name: string, options: ProviderOptions): AnalyticsProvider | undefined {
	const factory = REGISTRY[name];
	if (!factory) {
		if (import.meta.env.DEV) console.warn(`[tp] unknown analytics provider "${name}"`);
		return undefined;
	}
	return guarded(name, "setup", () => factory(options));
}

function consentCategoryOf(provider: AnalyticsProvider): CategoryId | null {
	return provider.vendor === null ? null : VENDORS[provider.vendor].category;
}

function categoryDeclined(category: CategoryId): boolean {
	return consent.decided() && !consent.get(category);
}

function someProviderMayStillStart(): boolean {
	return providersAwaitingConsent.some(({ category }) => !categoryDeclined(category));
}

function discardQueueIfNoProviderMayStart(): void {
	if (!someProviderMayStillStart()) queue = [];
}

function startProvider(provider: AnalyticsProvider): void {
	providersAwaitingConsent = providersAwaitingConsent.filter((awaiting) => awaiting.provider !== provider);
	const initialised = guarded(provider.name, "setup", () => {
		provider.init?.();
		return true;
	});
	if (!initialised) return;
	startedProviders.push(provider);
	for (const item of queue) dispatch(item.event, item.props, [provider]);
}

export function initAnalytics(): void {
	if (initialized) return;
	initialized = true;

	const config = readConfig();
	const options = { gaMeasurementId: config.gaMeasurementId };
	const providers = config.providers
		.map((name) => createProvider(name, options))
		.filter((provider): provider is AnalyticsProvider => provider !== undefined);
	providersAwaitingConsent = providers.flatMap((provider) => {
		const category = consentCategoryOf(provider);
		return category === null ? [] : [{ provider, category }];
	});

	providers.filter((provider) => provider.vendor === null).forEach(startProvider);
	for (const { provider, category } of providersAwaitingConsent) {
		consent.whenGranted(category, () => startProvider(provider));
	}
	consent.onChange(discardQueueIfNoProviderMayStart);
	discardQueueIfNoProviderMayStart();
}

export function track<E extends EventName>(event: E, props: TpEvents[E]): void {
	const { clean, violations } = sanitize(event, props);
	violations.forEach(reportWithoutThrowing);
	const queueIsUseful = !initialized || someProviderMayStillStart();
	const queued = queueIsUseful && queue.length < MAX_QUEUE;
	if (queued) queue.push({ event, props: clean });
	if (import.meta.env.DEV && (queued || startedProviders.length > 0)) recordForInspection(event, clean);
	dispatch(event, clean, startedProviders);
}
