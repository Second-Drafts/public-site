import { describe, expect, it } from "vitest";
import { findSentinelLeaks, findViolations, pageUrlExposure, requestExposures, type Observation } from "./scan";

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
	const leaksIn = (...requests: { url: string; body: string }[]) =>
		findSentinelLeaks(requests.flatMap(requestExposures), ["SENTINEL"]);

	it("finds a sentinel in a request URL or body", () => {
		expect(
			leaksIn(
				{ url: "https://a.test/collect?x=SENTINEL", body: "" },
				{ url: "https://b.test/collect", body: "text=SENTINEL" },
				{ url: "https://c.test/ok", body: "fine" },
			),
		).toEqual([
			'request to https://a.test/collect contains "SENTINEL"',
			'request body sent to https://b.test/collect contains "SENTINEL"',
		]);
	});

	it("finds nothing when no request carries it", () => {
		expect(leaksIn({ url: "https://c.test/ok", body: "" })).toEqual([]);
	});

	it("finds a percent-encoded sentinel", () => {
		const sentinel = "a+b$c";
		const exposures = requestExposures({ url: `https://a.test/?q=${encodeURIComponent(sentinel)}`, body: "" });
		expect(findSentinelLeaks(exposures, [sentinel])).toEqual(['request to https://a.test/ contains "a+b$c"']);
	});

	it("survives text that is not valid percent-encoding", () => {
		expect(leaksIn({ url: "https://a.test/?q=%E0%A4%A", body: "100% SENTINEL" })).toEqual([
			'request body sent to https://a.test/ contains "SENTINEL"',
		]);
	});

	it("names the analytics page parameter that carries it, in the query or a batched body", () => {
		expect(
			leaksIn(
				{ url: "https://region1.google-analytics.com/g/collect?v=2&dt=SENTINEL", body: "" },
				{
					url: "https://region1.google-analytics.com/g/collect?v=2",
					body: "en=a&dl=x\nen=b&dr=https%3A%2F%2Fr.test%2F%3Fq%3DSENTINEL",
				},
			),
		).toEqual([
			'request to https://region1.google-analytics.com/g/collect contains "SENTINEL"',
			'analytics parameter dt sent to https://region1.google-analytics.com/g/collect contains "SENTINEL"',
			'request body sent to https://region1.google-analytics.com/g/collect contains "SENTINEL"',
			'analytics parameter dr sent to https://region1.google-analytics.com/g/collect contains "SENTINEL"',
		]);
	});

	it("ignores the page URL fragment but not its path or query", () => {
		const urls = ["https://a.test/tool/#s=SENTINEL", "https://a.test/tool/?s=SENTINEL", "https://a.test/SENTINEL/"];
		const leaks = urls.map((url) => findSentinelLeaks([pageUrlExposure(url)], ["SENTINEL"]));
		expect(leaks).toEqual([[], ['page URL contains "SENTINEL"'], ['page URL contains "SENTINEL"']]);
	});

	it("checks console messages, page errors and titles alike", () => {
		const exposures = [
			{ channel: "console.log", text: "typed SENTINEL" },
			{ channel: "page error", text: "TypeError: SENTINEL is not a function" },
			{ channel: "document title", text: "Word Counter" },
		];
		expect(findSentinelLeaks(exposures, ["SENTINEL"])).toEqual([
			'console.log contains "SENTINEL"',
			'page error contains "SENTINEL"',
		]);
	});
});
