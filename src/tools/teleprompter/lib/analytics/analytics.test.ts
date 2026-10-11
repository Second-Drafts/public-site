import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveProviders } from "./config";
import type { AnalyticsProvider, EventName, EventProps } from "./events";
import { hostnameOf, landingSource } from "./index";
import type { VendorId } from "../../../../lib/privacy/registry";

function fakeProvider(name = "fake", vendor: VendorId | null = "google-analytics") {
	const calls: { event: EventName; props: EventProps }[] = [];
	const provider: AnalyticsProvider = {
		name,
		vendor,
		track: (event, props) => void calls.push({ event, props }),
	};
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

	beforeEach(() => {
		vi.stubGlobal("location", { hostname: "tools.example" });
	});
	afterEach(() => vi.unstubAllGlobals());

	it("direct with no referrer or an invalid one", () => {
		expect(landingSource("", "")).toBe("direct");
		expect(landingSource("not a url", "")).toBe("direct");
	});

	it("direct for same-origin referrers", () => {
		expect(landingSource("https://tools.example/blog", "")).toBe("direct");
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

describe("hostnameOf", () => {
	it("returns hostname only", () => {
		expect(hostnameOf("https://www.google.com/search?q=secret")).toBe("www.google.com");
	});
	it("returns empty string for none or invalid", () => {
		expect(hostnameOf("")).toBe("");
		expect(hostnameOf("nope")).toBe("");
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

function fakeConsent({ granted = true, decided = true }: { granted?: boolean; decided?: boolean } = {}) {
	const state = { granted, decided };
	const listeners = new Set<() => void>();
	const notify = () => listeners.forEach((listener) => listener());
	const isGranted = (category: string) => category === "necessary" || state.granted;
	return {
		module: {
			consent: {
				get: isGranted,
				decided: () => state.decided,
				onChange: (listener: () => void) => {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				whenGranted: (category: string, run: () => void) => {
					if (isGranted(category)) return run();
					const listener = () => {
						if (!isGranted(category)) return;
						listeners.delete(listener);
						run();
					};
					listeners.add(listener);
				},
			},
		},
		grant() {
			Object.assign(state, { granted: true, decided: true });
			notify();
		},
		reject() {
			Object.assign(state, { granted: false, decided: true });
			notify();
		},
	};
}

describe("track", () => {
	let fake = fakeConsent();

	async function loadAnalytics(providers: AnalyticsProvider[]) {
		vi.resetModules();
		vi.doMock("../../../../lib/privacy/consent", () => fake.module);
		vi.doMock("./config", () => ({
			readConfig: () => ({ providers: providers.map((p) => p.name), gaMeasurementId: "" }),
		}));
		vi.doMock("./providers", () => ({
			REGISTRY: Object.fromEntries(providers.map((p) => [p.name, () => p])),
		}));
		return import("./index");
	}

	beforeEach(() => {
		fake = fakeConsent();
		vi.stubGlobal("window", {
			matchMedia: () => ({ matches: false }),
			screen: { width: 1440, height: 900 },
		});
		vi.stubGlobal("navigator", { platform: "Win32", userAgent: "Windows", maxTouchPoints: 0 });
	});
	afterEach(() => {
		vi.doUnmock("./config");
		vi.doUnmock("./providers");
		vi.doUnmock("../../../../lib/privacy/consent");
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it("keeps primitives, drops objects and long strings, and adds device type", async () => {
		vi.stubEnv("DEV", false);
		const { provider, calls } = fakeProvider();
		const { initAnalytics, track } = await loadAnalytics([provider]);
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
		expect(props.device_type).toBe("desktop");
	});

	it("keeps a 64-char string", async () => {
		const { provider, calls } = fakeProvider();
		const { initAnalytics, track } = await loadAnalytics([provider]);
		initAnalytics();
		track("tp_script_entered", { word_bucket: "0-50", source: "x".repeat(64) } as never);
		expect(calls[0].props.source).toHaveLength(64);
	});

	it("drops properties that are not in the event's schema or have the wrong kind", async () => {
		vi.stubEnv("DEV", false);
		const { provider, calls } = fakeProvider();
		const { initAnalytics, track } = await loadAnalytics([provider]);
		initAnalytics();
		track("tp_play", { word_bucket: "201-600", play_count: "three", script_text: "hello" } as never);
		const props = calls[0].props;
		expect(props.word_bucket).toBe("201-600");
		expect(props).not.toHaveProperty("play_count");
		expect(props).not.toHaveProperty("script_text");
	});

	describe("a dropped property is reported, never thrown", () => {
		it.each([
			["a property outside the schema", { word_bucket: "0-50", play_count: 1, script_text: "hi" }, "script_text"],
			["a string over the length cap", { word_bucket: "x".repeat(65), play_count: 1 }, "word_bucket"],
			["a value that is not a primitive", { word_bucket: "0-50", play_count: { n: 1 } }, "play_count"],
			["a value of the wrong kind", { word_bucket: "0-50", play_count: "three" }, "play_count"],
		])("reports %s and still sends the rest", async (_name, props, key) => {
			const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
			const { provider, calls } = fakeProvider();
			const { initAnalytics, track } = await loadAnalytics([provider]);
			initAnalytics();
			expect(() => track("tp_play", props as never)).not.toThrow();
			expect(consoleError).toHaveBeenCalledTimes(1);
			expect(String(consoleError.mock.calls[0][0])).toContain(key);
			expect(calls).toHaveLength(1);
			expect(calls[0].props).not.toHaveProperty(key);
			consoleError.mockRestore();
		});
	});

	it("sends a page view with no referrer domain when the hostname is too long to be sent", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal("location", { hostname: "tools.example" });
		const { provider, calls } = fakeProvider();
		const { initAnalytics, trackPageView } = await loadAnalytics([provider]);
		initAnalytics();
		trackPageView({ referrer: `https://${"a".repeat(70)}.example/`, hash: "" });
		expect(consoleError).not.toHaveBeenCalled();
		expect(calls[0].props).toMatchObject({ referrer_domain: "", landing_source: "referral" });
		consoleError.mockRestore();
	});

	it("queues events before init and flushes them on init", async () => {
		const { provider, calls } = fakeProvider();
		const { initAnalytics, track } = await loadAnalytics([provider]);
		track("tp_play", { word_bucket: "201-600", play_count: 1 });
		expect(calls).toHaveLength(0);
		initAnalytics();
		expect(calls).toHaveLength(1);
		expect(calls[0].event).toBe("tp_play");
	});

	it("init is idempotent", async () => {
		const init = vi.fn();
		const { provider, calls } = fakeProvider();
		const { initAnalytics, track } = await loadAnalytics([{ ...provider, init }]);
		initAnalytics();
		initAnalytics();
		track("tp_share_link_opened", {});
		expect(init).toHaveBeenCalledTimes(1);
		expect(calls).toHaveLength(1);
	});

	it("a throwing provider does not break the others", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const bad: AnalyticsProvider = {
			name: "bad",
			vendor: null,
			track() {
				throw new Error("boom");
			},
		};
		const badInit: AnalyticsProvider = {
			name: "badInit",
			vendor: null,
			init() {
				throw new Error("boom");
			},
			track() {
				throw new Error("should not be used");
			},
		};
		const { provider, calls } = fakeProvider();
		const { initAnalytics, track } = await loadAnalytics([bad, badInit, provider]);
		initAnalytics();
		expect(() => track("tp_share_link_opened", {})).not.toThrow();
		expect(calls).toHaveLength(1);
		warn.mockRestore();
	});
	describe("consent gate", () => {
		it("starts a provider with no vendor without waiting for consent", async () => {
			fake = fakeConsent({ granted: false, decided: false });
			const init = vi.fn();
			const { provider, calls } = fakeProvider("console", null);
			const { initAnalytics, track } = await loadAnalytics([{ ...provider, init }]);
			initAnalytics();
			track("tp_play", { word_bucket: "201-600", play_count: 1 });
			expect(init).toHaveBeenCalledTimes(1);
			expect(calls).toHaveLength(1);
		});

		it("starts a provider with no vendor even after the visitor declines", async () => {
			fake = fakeConsent({ granted: false, decided: true });
			const { provider, calls } = fakeProvider("console", null);
			const { initAnalytics, track } = await loadAnalytics([provider]);
			initAnalytics();
			track("tp_play", { word_bucket: "201-600", play_count: 1 });
			expect(calls).toHaveLength(1);
		});

		it("waits for each provider's own vendor category", async () => {
			fake = fakeConsent({ granted: false, decided: true });
			const necessary = fakeProvider("pages", "github-pages");
			const analytics = fakeProvider("ga");
			const { initAnalytics, track } = await loadAnalytics([necessary.provider, analytics.provider]);
			initAnalytics();
			track("tp_share_link_opened", {});
			expect(necessary.calls).toHaveLength(1);
			expect(analytics.calls).toHaveLength(0);
		});

		it("replays events from before a provider started only to that provider", async () => {
			fake = fakeConsent({ granted: false, decided: false });
			const console = fakeProvider("console", null);
			const analytics = fakeProvider("ga");
			const { initAnalytics, track } = await loadAnalytics([console.provider, analytics.provider]);
			track("tp_play", { word_bucket: "201-600", play_count: 1 });
			initAnalytics();
			track("tp_share_link_opened", {});
			fake.grant();
			expect(console.calls.map((call) => call.event)).toEqual(["tp_play", "tp_share_link_opened"]);
			expect(analytics.calls.map((call) => call.event)).toEqual(["tp_play", "tp_share_link_opened"]);
		});

		it("does not start providers or dispatch while undecided", async () => {
			fake = fakeConsent({ granted: false, decided: false });
			const init = vi.fn();
			const { provider, calls } = fakeProvider();
			const { initAnalytics, track } = await loadAnalytics([{ ...provider, init }]);
			initAnalytics();
			track("tp_play", { word_bucket: "201-600", play_count: 1 });
			expect(init).not.toHaveBeenCalled();
			expect(calls).toHaveLength(0);
		});

		it("starts once on grant and flushes the queue in order", async () => {
			fake = fakeConsent({ granted: false, decided: false });
			const init = vi.fn();
			const { provider, calls } = fakeProvider();
			const { initAnalytics, track } = await loadAnalytics([{ ...provider, init }]);
			initAnalytics();
			track("tp_play", { word_bucket: "201-600", play_count: 1 });
			track("tp_share_link_opened", {});
			fake.grant();
			fake.grant();
			expect(init).toHaveBeenCalledTimes(1);
			expect(calls.map((call) => call.event)).toEqual(["tp_play", "tp_share_link_opened"]);
		});

		it("starts immediately when already granted", async () => {
			const init = vi.fn();
			const { provider } = fakeProvider();
			const { initAnalytics } = await loadAnalytics([{ ...provider, init }]);
			initAnalytics();
			expect(init).toHaveBeenCalledTimes(1);
		});

		it("clears the queue on rejection and drops later events", async () => {
			fake = fakeConsent({ granted: false, decided: false });
			const { provider, calls } = fakeProvider();
			const { initAnalytics, track } = await loadAnalytics([provider]);
			initAnalytics();
			track("tp_play", { word_bucket: "201-600", play_count: 1 });
			fake.reject();
			track("tp_share_link_opened", {});
			fake.grant();
			expect(calls).toHaveLength(0);
		});

		it("sends nothing when Global Privacy Control applies at load", async () => {
			fake = fakeConsent({ granted: false, decided: true });
			const init = vi.fn();
			const { provider, calls } = fakeProvider();
			const { initAnalytics, track } = await loadAnalytics([{ ...provider, init }]);
			track("tp_play", { word_bucket: "201-600", play_count: 1 });
			initAnalytics();
			track("tp_share_link_opened", {});
			expect(init).not.toHaveBeenCalled();
			fake.grant();
			expect(calls).toHaveLength(0);
		});

		it("caps the pre-decision queue at 100 events", async () => {
			fake = fakeConsent({ granted: false, decided: false });
			const { provider, calls } = fakeProvider();
			const { initAnalytics, track } = await loadAnalytics([provider]);
			initAnalytics();
			for (let i = 0; i < 150; i++) track("tp_share_link_opened", {});
			fake.grant();
			expect(calls).toHaveLength(100);
		});
	});
});
