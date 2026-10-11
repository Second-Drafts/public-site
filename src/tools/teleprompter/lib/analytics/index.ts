import { readConfig } from "./config";
import type {
	AnalyticsProvider,
	DeviceType,
	EventName,
	EventProps,
	LandingSource,
	SessionContext,
	TpEvents,
} from "./events";
import { REGISTRY, type ProviderOptions } from "./providers";
import { hasShareParam } from "../share-hash";
import { consent } from "../../../../lib/privacy/consent";

const MAX_STRING_LENGTH = 64;
const MAX_QUEUE = 100;

declare global {
	interface Window {
		__tpEvents?: { event: string; props: EventProps }[];
	}
}

let providers: AnalyticsProvider[] = [];
let initialized = false;
let providersStarted = false;
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

export function trackPageView({ referrer, hash }: { referrer: string; hash: string }): void {
	track("tp_page_view", { referrer_domain: hostnameOf(referrer), landing_source: landingSource(referrer, hash) });
}

function sanitize(props: object): EventProps {
	const out: EventProps = {};
	for (const [key, value] of Object.entries(props)) {
		if (typeof value === "string") {
			if (value.length > MAX_STRING_LENGTH) {
				if (import.meta.env.DEV) {
					console.warn(`[tp] dropped "${key}": string longer than ${MAX_STRING_LENGTH} chars (content leak?)`);
				}
				continue;
			}
			out[key] = value;
		} else if (typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
			out[key] = value;
		} else if (import.meta.env.DEV) {
			console.warn(`[tp] dropped "${key}": not a string, number or boolean`);
		}
	}
	return out;
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

function dispatch(event: EventName, props: EventProps): void {
	const merged: EventProps = { ...props, ...context() };
	if (import.meta.env.DEV) (window.__tpEvents ??= []).push({ event, props: merged });
	for (const provider of providers) {
		guarded(provider.name, "track", () => provider.track(event, merged));
	}
}

function startProvider(name: string, options: ProviderOptions): AnalyticsProvider | undefined {
	const factory = REGISTRY[name];
	if (!factory) {
		if (import.meta.env.DEV) console.warn(`[tp] unknown analytics provider "${name}"`);
		return undefined;
	}
	return guarded(name, "setup", () => {
		const provider = factory(options);
		provider.init?.();
		return provider;
	});
}

function startProviders(): void {
	if (providersStarted) return;
	providersStarted = true;

	const config = readConfig();
	providers = config.providers
		.map((name) => startProvider(name, { gaMeasurementId: config.gaMeasurementId }))
		.filter((provider): provider is AnalyticsProvider => provider !== undefined);

	const pending = queue;
	queue = [];
	for (const item of pending) dispatch(item.event, item.props);
}

function visitorDeclined(): boolean {
	return consent.decided() && !consent.get("analytics");
}

function dropQueueIfDeclined(): void {
	if (visitorDeclined()) queue = [];
}

export function initAnalytics(): void {
	if (initialized) return;
	initialized = true;
	consent.whenGranted("analytics", startProviders);
	consent.onChange(dropQueueIfDeclined);
	dropQueueIfDeclined();
}

export function track<E extends EventName>(event: E, props: TpEvents[E]): void {
	const clean = sanitize(props);
	if (providersStarted) return dispatch(event, clean);
	if (visitorDeclined() || queue.length >= MAX_QUEUE) return;
	queue.push({ event, props: clean });
}
