import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveProviders } from "./config";
import type { AnalyticsProvider, EventName, EventProps } from "./events";
import {
	__setProvidersForTest,
	initAnalytics,
	landingSource,
	recordVisit,
	referrerDomain,
	track,
} from "./index";

function memoryStorage(): Storage {
	const data = new Map<string, string>();
	return {
		get length() {
			return data.size;
		},
		clear: () => data.clear(),
		getItem: (k) => (data.has(k) ? data.get(k)! : null),
		key: (i) => [...data.keys()][i] ?? null,
		removeItem: (k) => void data.delete(k),
		setItem: (k, v) => void data.set(k, String(v)),
	};
}

function fakeProvider(name = "fake") {
	const calls: { event: EventName; props: EventProps }[] = [];
	const provider: AnalyticsProvider = { name, track: (event, props) => void calls.push({ event, props }) };
	return { provider, calls };
}

describe("landingSource", () => {
	const engines = [
		"https://www.google.com/",
		"https://www.google.co.uk/search?q=x",
		"https://google.de/",
		"https://www.bing.com/search?q=x",
		"https://duckduckgo.com/",
		"https://search.yahoo.com/search",
		"https://uk.search.yahoo.com/search",
		"https://yandex.ru/",
		"https://yandex.com.tr/",
		"https://www.baidu.com/s",
		"https://www.ecosia.org/",
		"https://search.brave.com/",
		"https://www.startpage.com/",
		"https://kagi.com/",
	];
	it.each(engines)("organic for %s", (url) => {
		expect(landingSource(url, "")).toBe("organic");
	});

	it("direct with no referrer or an invalid one", () => {
		expect(landingSource("", "")).toBe("direct");
		expect(landingSource("not a url", "")).toBe("direct");
	});

	it("direct for same-origin referrers", () => {
		vi.stubGlobal("location", { hostname: "example.org" });
		try {
			expect(landingSource("https://example.org/blog", "")).toBe("direct");
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("referral for other sites, including look-alike search hosts", () => {
		expect(landingSource("https://news.ycombinator.com/", "")).toBe("referral");
		expect(landingSource("https://notgoogle.com/", "")).toBe("referral");
		expect(landingSource("https://google.evil.com/", "")).toBe("referral");
	});

	it("share_link wins when the hash carries a share payload", () => {
		expect(landingSource("https://www.google.com/", "#s=abc")).toBe("share_link");
		expect(landingSource("", "#x=1&s=abc")).toBe("share_link");
		expect(landingSource("", "s=abc")).toBe("share_link");
	});

	it("ignores hashes that are not share payloads", () => {
		expect(landingSource("", "#section")).toBe("direct");
		expect(landingSource("", "#sx=1")).toBe("direct");
		expect(landingSource("https://www.bing.com/", "#top")).toBe("organic");
	});
});

describe("referrerDomain", () => {
	it("returns hostname only", () => {
		expect(referrerDomain("https://www.google.com/search?q=secret")).toBe("www.google.com");
	});
	it("returns empty string for none or invalid", () => {
		expect(referrerDomain("")).toBe("");
		expect(referrerDomain("nope")).toBe("");
	});
});

describe("resolveProviders", () => {
	it("defaults to console in dev", () => {
		expect(resolveProviders({ DEV: true }).providers).toEqual(["console"]);
	});
	it("defaults to nothing in production", () => {
		expect(resolveProviders({ DEV: false }).providers).toEqual([]);
	});
	it("skips gtag without a measurement ID", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(resolveProviders({ DEV: false, PUBLIC_ANALYTICS_PROVIDER: "gtag" }).providers).toEqual([]);
		expect(resolveProviders({ DEV: true, PUBLIC_ANALYTICS_PROVIDER: "gtag" }).providers).toEqual([]);
		expect(warn).toHaveBeenCalledTimes(1);
		warn.mockRestore();
	});
	it("enables gtag with an ID, alongside others", () => {
		const config = resolveProviders({
			DEV: false,
			PUBLIC_ANALYTICS_PROVIDER: "console, gtag",
			PUBLIC_GA_MEASUREMENT_ID: "G-TEST123",
		});
		expect(config.providers).toEqual(["console", "gtag"]);
		expect(config.gaMeasurementId).toBe("G-TEST123");
	});
	it('"none" turns everything off, even in dev', () => {
		expect(resolveProviders({ DEV: true, PUBLIC_ANALYTICS_PROVIDER: "none" }).providers).toEqual([]);
	});
});

describe("track", () => {
	beforeEach(() => {
		vi.stubGlobal("sessionStorage", memoryStorage());
	});
	afterEach(() => {
		__setProvidersForTest(null);
		vi.unstubAllGlobals();
	});

	it("keeps primitives, drops objects and long strings, and merges session context", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { provider, calls } = fakeProvider();
		__setProvidersForTest([provider]);
		initAnalytics();
		track("tp_script_entered", {
			word_bucket: "51-200",
			source: "paste",
			nested: { a: 1 },
			list: [1, 2],
			leaked: "x".repeat(65),
			fn: () => 1,
		} as never);
		expect(calls).toHaveLength(1);
		const props = calls[0].props;
		expect(props.word_bucket).toBe("51-200");
		expect(props.source).toBe("paste");
		expect(props).not.toHaveProperty("nested");
		expect(props).not.toHaveProperty("list");
		expect(props).not.toHaveProperty("leaked");
		expect(props).not.toHaveProperty("fn");
		expect(typeof props.session_id).toBe("string");
		expect(props.device_type).toBe("desktop");
		warn.mockRestore();
	});

	it("keeps a 64-char string", () => {
		const { provider, calls } = fakeProvider();
		__setProvidersForTest([provider]);
		initAnalytics();
		track("tp_script_entered", { word_bucket: "0-50", source: "x".repeat(64) } as never);
		expect(calls[0].props.source).toHaveLength(64);
	});

	it("uses a stable session id across events", () => {
		const { provider, calls } = fakeProvider();
		__setProvidersForTest([provider]);
		initAnalytics();
		track("tp_share_link_opened", {});
		track("tp_share_link_opened", {});
		expect(calls[0].props.session_id).toBe(calls[1].props.session_id);
	});

	it("queues events before init and flushes them on init", () => {
		const { provider, calls } = fakeProvider();
		__setProvidersForTest([provider]);
		track("tp_play", { word_bucket: "201-600", play_count: 1 });
		expect(calls).toHaveLength(0);
		initAnalytics();
		expect(calls).toHaveLength(1);
		expect(calls[0].event).toBe("tp_play");
	});

	it("init is idempotent", () => {
		const init = vi.fn();
		const { provider, calls } = fakeProvider();
		__setProvidersForTest([{ ...provider, init }]);
		initAnalytics();
		initAnalytics();
		track("tp_share_link_opened", {});
		expect(init).toHaveBeenCalledTimes(1);
		expect(calls).toHaveLength(1);
	});

	it("a throwing provider does not break the others", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const bad: AnalyticsProvider = {
			name: "bad",
			track() {
				throw new Error("boom");
			},
		};
		const badInit: AnalyticsProvider = {
			name: "badInit",
			init() {
				throw new Error("boom");
			},
			track() {
				throw new Error("should not be used");
			},
		};
		const { provider, calls } = fakeProvider();
		__setProvidersForTest([bad, badInit, provider]);
		initAnalytics();
		expect(() => track("tp_share_link_opened", {})).not.toThrow();
		expect(calls).toHaveLength(1);
		warn.mockRestore();
	});
});

describe("recordVisit", () => {
	const DAY = 24 * 60 * 60 * 1000;
	beforeEach(() => {
		vi.stubGlobal("localStorage", memoryStorage());
		vi.stubGlobal("sessionStorage", memoryStorage());
	});
	afterEach(() => vi.unstubAllGlobals());

	it("returns null on the first visit and stores the time", () => {
		expect(recordVisit(1000)).toBeNull();
		expect(localStorage.getItem("tp:lastVisit")).toBe("1000");
	});

	it("returns whole days since the previous visit", () => {
		localStorage.setItem("tp:lastVisit", String(10 * DAY));
		expect(recordVisit(10 * DAY + 3.9 * DAY)).toBe(3);
		expect(localStorage.getItem("tp:lastVisit")).toBe(String(13.9 * DAY));
	});

	it("returns 0 for a new session on the same day", () => {
		localStorage.setItem("tp:lastVisit", String(5 * DAY));
		expect(recordVisit(5 * DAY + 1000)).toBe(0);
	});

	it("counts once per session; reloads return null and keep lastVisit", () => {
		localStorage.setItem("tp:lastVisit", String(DAY));
		expect(recordVisit(4 * DAY)).toBe(3);
		expect(recordVisit(5 * DAY)).toBeNull();
		expect(localStorage.getItem("tp:lastVisit")).toBe(String(4 * DAY));
	});
});
