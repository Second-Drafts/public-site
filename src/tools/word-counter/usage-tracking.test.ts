import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "../../lib/analytics";
import { createStore, mergeShallow } from "../../lib/store";
import { INITIAL_STATE, type State, type Store } from "./lib/state";
import { trackUsage, type UsageHooks } from "./usage-tracking";

vi.mock("../../lib/analytics", () => ({ track: vi.fn() }));

const tracked = vi.mocked(track);
const manyWords = Array.from({ length: 60 }, () => "word").join(" ");

describe("trackUsage", () => {
	let store: Store;
	let usage: UsageHooks;

	function start(initial: Partial<State> = {}) {
		store = createStore({ ...INITIAL_STATE, ...initial }, mergeShallow<State>);
		usage = trackUsage(store);
	}

	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal("addEventListener", vi.fn());
		tracked.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("reports restored text at once", () => {
		start({ text: "one two three" });
		expect(tracked).toHaveBeenCalledWith("wc_text_entered", { word_bucket: "0-50", source: "restored" });
	});

	it("reports nothing for empty or blank text", () => {
		start({ text: "" });
		store.set({ text: "  " });
		usage.onTextInput("typed");
		vi.advanceTimersByTime(2000);
		expect(tracked).not.toHaveBeenCalled();
	});

	it("reports a paste over typing once the text settles, once per visit", () => {
		start();
		store.set({ text: "one two" });
		usage.onTextInput("typed");
		usage.onTextInput("paste");
		expect(tracked).not.toHaveBeenCalled();
		vi.advanceTimersByTime(2000);
		usage.onTextInput("typed");
		vi.advanceTimersByTime(2000);
		expect(tracked).toHaveBeenCalledTimes(1);
		expect(tracked).toHaveBeenCalledWith("wc_text_entered", { word_bucket: "0-50", source: "paste" });
	});

	it("reports a chosen target once it settles", () => {
		start();
		store.set({ showTarget: true });
		store.set({ target: { unit: "characters", rule: "at-most", value: 280 }, presetId: "tweet" });
		vi.advanceTimersByTime(1000);
		expect(tracked).toHaveBeenCalledTimes(1);
		expect(tracked).toHaveBeenCalledWith("wc_target_set", { preset: "tweet", unit: "characters", rule: "at-most" });
	});

	it("ignores system changes and a hidden target", () => {
		start();
		store.set({ target: { unit: "words", rule: "exactly", value: 5 } });
		vi.advanceTimersByTime(5000);
		store.set({ showTarget: true }, "system");
		vi.advanceTimersByTime(5000);
		expect(tracked).not.toHaveBeenCalled();
	});

	it("reports the first time the target is met, once", () => {
		start({ showTarget: true, target: { unit: "words", rule: "at-least", value: 2 } });
		store.set({ text: "one" });
		expect(tracked).not.toHaveBeenCalled();
		store.set({ text: "one two" });
		store.set({ text: "one two three" });
		expect(tracked).toHaveBeenCalledTimes(1);
		expect(tracked).toHaveBeenCalledWith("wc_target_reached", { preset: "custom", rule: "at-least" });
	});

	it("does not report a target met by restored text", () => {
		start({ text: "one two three", showTarget: true, target: { unit: "words", rule: "at-least", value: 2 } });
		expect(tracked).not.toHaveBeenCalledWith("wc_target_reached", expect.anything());
	});

	it("reports engagement after a minute of editing a longer text", () => {
		start();
		store.set({ text: manyWords });
		vi.advanceTimersByTime(60_000);
		const engaged = tracked.mock.calls.filter(([name]) => name === "wc_engaged");
		expect(engaged).toEqual([["wc_engaged", { word_bucket: "51-200", duration_s: 60 }]]);
	});

	it("does not report engagement for a short text", () => {
		start();
		store.set({ text: "one two" });
		vi.advanceTimersByTime(120_000);
		expect(tracked).not.toHaveBeenCalledWith("wc_engaged", expect.anything());
	});

	it("exposes hooks for the later tickets", () => {
		start({ text: "" });
		usage.onCutLineShown();
		usage.onCutLineShown();
		usage.onSelectionCounted();
		usage.onSelectionCounted();
		usage.onSprintStarted(10);
		usage.onSprintFinished(10);
		usage.onRhythmOpened();
		usage.onRhythmSentenceClicked();
		usage.onOpenedInTeleprompter();
		expect(tracked.mock.calls).toEqual([
			["wc_cut_line_shown", { rule: "at-most", unit: "words" }],
			["wc_selection_counted", {}],
			["wc_sprint_started", { minutes: 10 }],
			["wc_sprint_finished", { minutes: 10, word_bucket: "0-50" }],
			["wc_rhythm_opened", {}],
			["wc_rhythm_sentence_clicked", {}],
			["wc_opened_in_teleprompter", { word_bucket: "0-50" }],
		]);
	});
});
