// Rules the pre-deploy scan applies to what a real browser observed. Keep imports to the registry and its lock so Node scripts can load it.
import { CATEGORIES, VENDORS, findStorageEntry, type CategoryId, type StorageArea } from "./registry.ts";
import lock from "./registry.lock.json" with { type: "json" };

export type ScanState = "no-decision" | "rejected" | "accepted" | "gpc" | "withdrawn";

export const SCAN_STATES: readonly ScanState[] = ["no-decision", "rejected", "accepted", "gpc", "withdrawn"];

export type ObservedStorageArea = StorageArea | "indexeddb" | "cache";

export interface Observation {
	storage: { area: ObservedStorageArea; name: string }[];
	requestOrigins: string[];
	cspViolations: string[];
}

export interface RecordedRequest {
	url: string;
	body: string;
}

function isGranted(state: ScanState, category: CategoryId): boolean {
	if (!CATEGORIES[category].requiresConsent) return true;
	return state === "accepted";
}

function originMatches(pattern: string, origin: string): boolean {
	if (!pattern.includes("*")) return pattern === origin;
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace("*", "[^/.]+(\\.[^/.]+)*");
	return new RegExp(`^${escaped}$`).test(origin);
}

function vendorsContacting(origin: string) {
	return Object.values(VENDORS).filter((vendor) =>
		[...vendor.origins.scripts, ...vendor.origins.data].some((pattern) => originMatches(pattern, origin)),
	);
}

function storageViolation(state: ScanState, { area, name }: Observation["storage"][number]): string | undefined {
	if (area === "indexeddb" || area === "cache") return `${area} "${name}" is not in the registry`;
	const entry = findStorageEntry(area, name);
	if (!entry) return `${area} storage "${name}" is not in the registry`;
	if (!isGranted(state, entry.category)) return `${name} (${entry.category}) exists without consent`;
	return undefined;
}

function requestViolation(state: ScanState, selfOrigin: string, origin: string): string | undefined {
	if (origin === selfOrigin) return undefined;
	const vendors = vendorsContacting(origin);
	if (vendors.length === 0) return `request to unregistered origin ${origin}`;
	const denied = vendors.find((vendor) => !isGranted(state, vendor.category));
	if (denied) return `request to ${denied.name} (${origin}) without consent`;
	return undefined;
}

export function findViolations(state: ScanState, observation: Observation, selfOrigin: string): string[] {
	const found = [
		...observation.storage.map((item) => storageViolation(state, item)),
		...observation.requestOrigins.map((origin) => requestViolation(state, selfOrigin, origin)),
		...observation.cspViolations.map((violation) => `CSP violation: ${violation}`),
	];
	return found.filter((message): message is string => message !== undefined);
}

/** Somewhere text from the page could end up outside the visitor's browser or in someone else's logs. */
export interface Exposure {
	channel: string;
	text: string;
}

const ANALYTICS_PAGE_PARAMETERS = ["page_location", "dl", "dr", "dt"];

// Google Analytics batches hits: one in the query string, or one per line of the body.
function hitParameters({ url, body }: RecordedRequest): URLSearchParams[] {
	return [new URL(url).search, ...body.split("\n")].map((query) => new URLSearchParams(query));
}

function analyticsParameterExposures(endpoint: string, request: RecordedRequest): Exposure[] {
	return hitParameters(request).flatMap((parameters) =>
		ANALYTICS_PAGE_PARAMETERS.filter((name) => parameters.has(name)).map((name) => ({
			channel: `analytics parameter ${name} sent to ${endpoint}`,
			text: parameters.get(name) ?? "",
		})),
	);
}

export function requestExposures(request: RecordedRequest): Exposure[] {
	const endpoint = request.url.split(/[?#]/)[0];
	return [
		{ channel: `request to ${endpoint}`, text: request.url },
		{ channel: `request body sent to ${endpoint}`, text: request.body },
		...analyticsParameterExposures(endpoint, request),
	];
}

function isAnalyticsHit(url: string): boolean {
	return new URL(url).pathname.endsWith("/g/collect");
}

/** Enhanced measurement is set in the Google Analytics admin, so only the hits show what it actually sends. */
export function undeclaredAnalyticsEvents(requests: RecordedRequest[]): string[] {
	const names = requests
		.filter(({ url }) => isAnalyticsHit(url))
		.flatMap((request) => hitParameters(request).map((parameters) => parameters.get("en")))
		.filter((name): name is string => name !== null && !(name in lock.analytics.events));
	return [...new Set(names)].map((name) => `analytics event "${name}" is not in registry.lock.json`);
}

export function pageUrlExposure(url: string): Exposure {
	return { channel: "page URL", text: url.split("#")[0] };
}

function decodedForms(text: string): string[] {
	try {
		return [text, decodeURIComponent(text)];
	} catch {
		return [text];
	}
}

export function findSentinelLeaks(exposures: Exposure[], sentinels: string[]): string[] {
	const leaks = exposures.flatMap(({ channel, text }) =>
		sentinels
			.filter((sentinel) => decodedForms(text).some((form) => form.includes(sentinel)))
			.map((sentinel) => `${channel} contains "${sentinel.slice(0, 24)}"`),
	);
	return [...new Set(leaks)];
}
