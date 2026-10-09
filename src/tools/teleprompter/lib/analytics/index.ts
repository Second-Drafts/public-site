/*
 * Analytics for the teleprompter, independent of any provider.
 *
 *   track("tp_play", { word_bucket: "201-600", play_count: 1 });
 *
 * Events are typed (events.ts). Providers are adapters (providers/): console in dev, noop by default
 * in production, gtag when PUBLIC_ANALYTICS_PROVIDER=gtag and PUBLIC_GA_MEASUREMENT_ID are set.
 * Adding a provider = one file implementing AnalyticsProvider + one line in the registry.
 */
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
import { REGISTRY } from "./providers";
import { read, write, KEYS } from "../storage";
import { hasShareParam } from "../share-hash";

const MAX_STRING_LENGTH = 64;
const MAX_QUEUE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_ID_KEY = "tp:sessionId";
const VISIT_RECORDED_KEY = "tp:visitRecorded";

declare global {
	interface Window {
		/** Dev only: every dispatched event, for browser-automation QA. */
		__tpEvents?: { event: string; props: EventProps }[];
	}
}

let providers: AnalyticsProvider[] = [];
let providersOverride: AnalyticsProvider[] | null = null;
let initialized = false;
let queue: { event: EventName; props: EventProps }[] = [];
let sessionId: string | null = null;

/* ------------------------------------------------------------------ session / device */

function sessionGet(key: string): string | null {
	try {
		return sessionStorage.getItem(key);
	} catch {
		return null;
	}
}

function sessionSet(key: string, value: string): void {
	try {
		sessionStorage.setItem(key, value);
	} catch {
		// private mode etc.; the value just won't survive a reload
	}
}

function newId(): string {
	const c = (globalThis as { crypto?: Crypto }).crypto;
	if (c && typeof c.randomUUID === "function") return c.randomUUID();
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
}

function getSessionId(): string {
	if (sessionId) return sessionId;
	const stored = sessionGet(SESSION_ID_KEY);
	if (stored) {
		sessionId = stored;
	} else {
		sessionId = newId();
		sessionSet(SESSION_ID_KEY, sessionId);
	}
	return sessionId;
}

export function deviceType(): DeviceType {
	try {
		if (typeof window === "undefined" || typeof navigator === "undefined") return "desktop";
		// iPadOS Safari reports itself as a Mac, but a Mac has no multi-touch screen.
		const macLike = /^Mac/i.test(navigator.platform || "") || /Macintosh/.test(navigator.userAgent || "");
		if (macLike && navigator.maxTouchPoints > 1) return "tablet";
		const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
		if (!coarse) return "desktop";
		const shorter = Math.min(window.screen?.width || Infinity, window.screen?.height || Infinity);
		return shorter < 600 ? "phone" : "tablet";
	} catch {
		return "desktop";
	}
}

/* ------------------------------------------------------------------ referrer / landing */

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

function hostnameOf(url: string): string {
	if (!url) return "";
	try {
		return new URL(url).hostname.toLowerCase();
	} catch {
		return "";
	}
}

/** Hostname only; "" when there is no referrer or it isn't a valid URL. */
export function referrerDomain(referrer: string): string {
	return hostnameOf(referrer);
}

/** share_link if the URL carries a share hash; organic for search-engine referrers; direct with none; else referral. */
export function landingSource(referrer: string, hash: string): LandingSource {
	if (hasShareParam(hash)) return "share_link";
	const host = hostnameOf(referrer);
	if (host === "") return "direct";
	if (SEARCH_HOSTS.some((re) => re.test(host))) return "organic";
	const here = (globalThis as { location?: { hostname?: string } }).location?.hostname?.toLowerCase();
	if (here && host === here) return "direct";
	return "referral";
}

/* ------------------------------------------------------------------ return visits */

/** Whole days since the previous visit, or null for a first visit or a reload within the same session. */
export function recordVisit(now: number = Date.now()): number | null {
	if (sessionGet(VISIT_RECORDED_KEY)) return null;
	sessionSet(VISIT_RECORDED_KEY, "1");
	const previous = Number(read(KEYS.lastVisit));
	const hadPrevious = read(KEYS.lastVisit) !== null && Number.isFinite(previous);
	write(KEYS.lastVisit, String(now));
	if (!hadPrevious) return null;
	return Math.max(0, Math.floor((now - previous) / DAY_MS));
}

export function trackPageView({ referrer, hash }: { referrer: string; hash: string }): void {
	track("tp_page_view", { referrer_domain: referrerDomain(referrer), landing_source: landingSource(referrer, hash) });
	const days = recordVisit();
	if (days !== null) track("tp_return_visit", { days_since_last: days });
}

/* ------------------------------------------------------------------ dispatch */

/** Keeps string/number/boolean values; drops everything else, and any string over 64 chars. */
function sanitize(props: unknown): EventProps {
	const out: EventProps = {};
	if (!props || typeof props !== "object") return out;
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

function dispatch(event: EventName, props: EventProps): void {
	const merged: EventProps = { ...props, ...context() };
	if (import.meta.env.DEV && typeof window !== "undefined") {
		(window.__tpEvents ??= []).push({ event, props: merged });
	}
	for (const provider of providers) {
		try {
			provider.track(event, merged);
		} catch (error) {
			if (import.meta.env.DEV) console.warn(`[tp] provider "${provider.name}" threw in track`, error);
		}
	}
}

/** Call once on page load. Safe to call twice. */
export function initAnalytics(): void {
	if (initialized) return;
	initialized = true;

	let candidates: AnalyticsProvider[];
	if (providersOverride) {
		candidates = providersOverride;
	} else {
		const config = readConfig();
		candidates = [];
		for (const name of config.providers) {
			const factory = REGISTRY[name];
			if (!factory) {
				if (import.meta.env.DEV) console.warn(`[tp] unknown analytics provider "${name}"`);
				continue;
			}
			try {
				candidates.push(factory({ gaMeasurementId: config.gaMeasurementId }));
			} catch (error) {
				if (import.meta.env.DEV) console.warn(`[tp] provider "${name}" failed to build`, error);
			}
		}
	}

	providers = [];
	for (const provider of candidates) {
		try {
			provider.init?.();
			providers.push(provider);
		} catch (error) {
			if (import.meta.env.DEV) console.warn(`[tp] provider "${provider.name}" threw in init`, error);
		}
	}

	const pending = queue;
	queue = [];
	for (const item of pending) dispatch(item.event, item.props);
}

export function track<E extends EventName>(event: E, props: TpEvents[E]): void {
	try {
		const clean = sanitize(props);
		if (!initialized) {
			if (queue.length < MAX_QUEUE) queue.push({ event, props: clean });
			return;
		}
		dispatch(event, clean);
	} catch {
		// analytics must never break the tool
	}
}

/** Test-only. An array replaces the configured providers on the next initAnalytics(); null resets all state. */
export function __setProvidersForTest(list: AnalyticsProvider[] | null): void {
	providersOverride = list;
	providers = [];
	initialized = false;
	queue = [];
	sessionId = null;
}
