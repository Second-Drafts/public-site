import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "./lib/analytics";
import { SAMPLE_SCRIPT } from "./lib/sample";
import { createStore, type Store } from "./lib/store";
import { DEFAULT_SETTINGS } from "./lib/settings";
import { trackUsage, type UsageHooks } from "./usage-tracking";

vi.mock("./lib/analytics", () => ({ track: vi.fn() }));

const tracked = vi.mocked(track);
const eventNames = () => tracked.mock.calls.map(([name]) => name);

describe("trackUsage", () => {
	let store: Store;
	let usage: UsageHooks;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal("addEventListener", vi.fn());
		tracked.mockClear();
		store = createStore({ script: "one two three", settings: DEFAULT_SETTINGS, view: "edit" });
		usage = trackUsage(store);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("reports a user setting change once it settles", () => {
		store.set({ settings: { mirror: true } });
		store.set({ settings: { mirror: false } });
		store.set({ settings: { mirror: true } });
		expect(tracked).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1000);
		expect(tracked).toHaveBeenCalledTimes(1);
		expect(tracked).toHaveBeenCalledWith("tp_setting_changed", { setting: "mirror", value: true });
	});

	it("ignores system setting changes", () => {
		store.set({ settings: { mirror: true } }, "system");
		vi.advanceTimersByTime(5000);
		expect(tracked).not.toHaveBeenCalled();
	});

	it("reports a paste over typing in the same settle window, once", () => {
		usage.onScriptInput("typed");
		usage.onScriptInput("paste");
		usage.onScriptInput("typed");
		vi.advanceTimersByTime(2000);
		expect(tracked).toHaveBeenCalledWith("tp_script_entered", { word_bucket: "0-50", source: "paste" });
		usage.onScriptInput("paste");
		vi.advanceTimersByTime(2000);
		expect(tracked).toHaveBeenCalledTimes(1);
	});

	it("does not report an empty script", () => {
		store.set({ script: "  " });
		usage.onScriptInput("typed");
		vi.advanceTimersByTime(2000);
		expect(tracked).not.toHaveBeenCalled();
	});

	it("tracks a prompt session from start through completion", () => {
		store.set({ view: "prompt" });
		usage.onPlay();
		usage.onPlay();
		usage.onReachedEnd();
		vi.advanceTimersByTime(30_000);
		store.set({ view: "edit" });
		expect(eventNames()).toEqual(["tp_prompt_started", "tp_play", "tp_play", "tp_completed"]);
		expect(tracked).toHaveBeenLastCalledWith("tp_completed", { reached_end: true, duration_s: 30, word_bucket: "0-50" });
		expect(tracked).toHaveBeenCalledWith("tp_play", { word_bucket: "0-50", play_count: 2 });
	});

	it("reports the sample script as entered when the prompt opens", () => {
		store.set({ script: SAMPLE_SCRIPT });
		tracked.mockClear();
		store.set({ view: "prompt" });
		expect(eventNames()).toEqual(["tp_script_entered", "tp_prompt_started"]);
		expect(tracked.mock.calls[0][1]).toMatchObject({ source: "sample" });
	});

	it("reports engagement after a minute of playing a long script", () => {
		store.set({ script: "word ".repeat(250) });
		store.set({ view: "prompt" });
		usage.onPlay();
		vi.advanceTimersByTime(65_000);
		expect(eventNames().filter((name) => name === "tp_engaged")).toHaveLength(1);
	});

	it("does not report engagement for a short script", () => {
		store.set({ view: "prompt" });
		usage.onPlay();
		vi.advanceTimersByTime(65_000);
		expect(eventNames()).not.toContain("tp_engaged");
	});

	it("reports share events", () => {
		usage.onShareCopied(true);
		usage.onShareLinkOpened();
		expect(tracked).toHaveBeenCalledWith("tp_share_link_copied", { word_bucket: "0-50", too_long: true });
		expect(tracked).toHaveBeenCalledWith("tp_share_link_opened", {});
	});
});
