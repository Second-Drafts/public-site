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
import { KEYS, read, session, write } from "../storage";
import { hasShareParam } from "../share-hash";

const MAX_STRING_LENGTH = 64;
const MAX_QUEUE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

declare global {
	interface Window {
		/** Dev only: every dispatched event, for browser-automation QA. */
		__tpEvents?: { event: string; props: EventProps }[];
	}
}

let providers: AnalyticsProvider[] = [];
let initialized = false;
let queue: { event: EventName; props: EventProps }[] = [];
let sessionId: string | null = null;

function getSessionId(): string {
	if (sessionId) return sessionId;
	const stored = read(KEYS.sessionId, session);
	sessionId = stored ?? crypto.randomUUID();
	if (stored === null) write(KEYS.sessionId, sessionId, session);
	return sessionId;
}

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

/** Hostname only; "" when there is no referrer or it isn't a valid URL. */
export function hostnameOf(url: string): string {
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		return "";
	}
}

/** share_link if the URL carries a share hash; organic for search-engine referrers; direct with none; else referral. */
export function landingSource(referrer: string, hash: string): LandingSource {
	if (hasShareParam(hash)) return "share_link";
	const host = hostnameOf(referrer);
	if (host === "") return "direct";
	if (SEARCH_HOSTS.some((re) => re.test(host))) return "organic";
	if (host === location.hostname.toLowerCase()) return "direct";
	return "referral";
}

/** Whole days since the previous visit, or null for a first visit or a reload within the same session. */
export function recordVisit(now: number = Date.now()): number | null {
	if (read(KEYS.visitRecorded, session)) return null;
	write(KEYS.visitRecorded, "1", session);
	const lastVisit = read(KEYS.lastVisit);
	write(KEYS.lastVisit, String(now));
	const previous = lastVisit === null ? NaN : Number(lastVisit);
	if (!Number.isFinite(previous)) return null;
	return Math.max(0, Math.floor((now - previous) / DAY_MS));
}

export function trackPageView({ referrer, hash }: { referrer: string; hash: string }): void {
	track("tp_page_view", { referrer_domain: hostnameOf(referrer), landing_source: landingSource(referrer, hash) });
	const days = recordVisit();
	if (days !== null) track("tp_return_visit", { days_since_last: days });
}

/** Keeps string/number/boolean values; drops everything else, and any string over 64 chars. */
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
	return { session_id: getSessionId(), device_type: deviceType() };
}

/** The one boundary around provider code: a provider that throws is skipped and never breaks the tool. */
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

/** Call once on page load. Safe to call twice. */
export function initAnalytics(): void {
	if (initialized) return;
	initialized = true;

	const config = readConfig();
	providers = config.providers
		.map((name) => startProvider(name, { gaMeasurementId: config.gaMeasurementId }))
		.filter((provider): provider is AnalyticsProvider => provider !== undefined);

	const pending = queue;
	queue = [];
	for (const item of pending) dispatch(item.event, item.props);
}

export function track<E extends EventName>(event: E, props: TpEvents[E]): void {
	const clean = sanitize(props);
	if (initialized) dispatch(event, clean);
	else if (queue.length < MAX_QUEUE) queue.push({ event, props: clean });
}
