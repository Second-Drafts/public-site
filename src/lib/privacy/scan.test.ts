import { describe, expect, it } from "vitest";
import { findSentinelLeaks, findViolations, type Observation } from "./scan";

const SELF = "http://localhost:4399";

function observe(overrides: Partial<Observation> = {}): Observation {
	return { storage: [], requestOrigins: [], cspViolations: [], ...overrides };
}

describe("storage", () => {
	it("allows registered necessary keys in every state", () => {
		const observation = observe({ storage: [{ area: "local", name: "tp:script" }] });
		expect(findViolations("no-decision", observation, SELF)).toEqual([]);
	});

	it("flags keys that are not in the registry", () => {
		const observation = observe({ storage: [{ area: "local", name: "rogue" }] });
		expect(findViolations("accepted", observation, SELF)).toEqual(['local storage "rogue" is not in the registry']);
	});

	it("flags a registered key found in the wrong area", () => {
		const observation = observe({ storage: [{ area: "session", name: "tp:script" }] });
		expect(findViolations("accepted", observation, SELF)).toHaveLength(1);
	});

	it("flags analytics cookies unless analytics was accepted", () => {
		const observation = observe({ storage: [{ area: "cookie", name: "_ga_ABC123" }] });
		expect(findViolations("accepted", observation, SELF)).toEqual([]);
		for (const state of ["no-decision", "rejected", "gpc", "withdrawn"] as const) {
			expect(findViolations(state, observation, SELF)).toEqual(["_ga_ABC123 (analytics) exists without consent"]);
		}
	});

	it("flags any IndexedDB database or cache", () => {
		const observation = observe({
			storage: [
				{ area: "indexeddb", name: "db" },
				{ area: "cache", name: "c" },
			],
		});
		expect(findViolations("accepted", observation, SELF)).toHaveLength(2);
	});
});

describe("requests", () => {
	it("allows the site's own origin", () => {
		expect(findViolations("rejected", observe({ requestOrigins: [SELF] }), SELF)).toEqual([]);
	});

	it("flags unregistered origins", () => {
		const observation = observe({ requestOrigins: ["https://example.org"] });
		expect(findViolations("accepted", observation, SELF)).toEqual([
			"request to unregistered origin https://example.org",
		]);
	});

	it("allows a vendor origin only with consent, matching wildcards", () => {
		const observation = observe({ requestOrigins: ["https://region1.google-analytics.com"] });
		expect(findViolations("accepted", observation, SELF)).toEqual([]);
		expect(findViolations("gpc", observation, SELF)).toEqual([
			"request to Google Analytics (https://region1.google-analytics.com) without consent",
		]);
	});

	it("does not let a wildcard match a lookalike host", () => {
		const observation = observe({
			requestOrigins: ["https://evilgoogle-analytics.com", "https://google-analytics.com.evil.io"],
		});
		expect(findViolations("accepted", observation, SELF)).toHaveLength(2);
	});
});

describe("CSP violations", () => {
	it("are reported", () => {
		const observation = observe({ cspViolations: ["script-src https://example.org/a.js"] });
		expect(findViolations("accepted", observation, SELF)).toEqual([
			"CSP violation: script-src https://example.org/a.js",
		]);
	});
});

describe("findSentinelLeaks", () => {
	it("finds a sentinel in a URL or a body", () => {
		const requests = [
			{ url: "https://a.test/collect?x=SENTINEL", body: "" },
			{ url: "https://b.test/collect", body: "text=SENTINEL" },
			{ url: "https://c.test/ok", body: "fine" },
		];
		expect(findSentinelLeaks(requests, ["SENTINEL"])).toHaveLength(2);
	});

	it("finds nothing when no request carries it", () => {
		expect(findSentinelLeaks([{ url: "https://c.test/ok", body: "" }], ["SENTINEL"])).toEqual([]);
	});
});
