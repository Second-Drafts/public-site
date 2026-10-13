import { describe, expect, it } from "vitest";
import { INITIAL_STATE, speakingTime, summarize, type State } from "./state";

const state = (patch: Partial<State>): State => ({ ...INITIAL_STATE, ...patch });

describe("summarize", () => {
	it.each<[string, State, string]>([
		["no text", state({}), "0 words"],
		["one word", state({ text: "Hello" }), "1 word"],
		["many words", state({ text: "word ".repeat(1240) }), "1,240 words"],
		["one character", state({ text: "a", target: { ...INITIAL_STATE.target, unit: "characters" } }), "1 character"],
		[
			"seconds",
			state({ text: "word ".repeat(150), target: { ...INITIAL_STATE.target, unit: "seconds" } }),
			"1 min aloud",
		],
		[
			"a target",
			state({ text: "word ".repeat(1240), showTarget: true, target: { unit: "words", value: 1000, rule: "at-most" } }),
			"1,240 / 1,000 words",
		],
		[
			"a target of one",
			state({ text: "word", showTarget: true, target: { unit: "words", value: 1, rule: "exactly" } }),
			"1 / 1 word",
		],
	])("%s → %s", (_, input, count) => {
		expect(summarize(input).count).toBe(count);
	});

	it("doesn't evaluate a target that's switched off", () => {
		expect(summarize(state({ text: "a b c", showTarget: false })).evaluation).toBeNull();
	});

	it.each([0, -1, NaN])("treats a target of %d as no target, with nothing divided by it", (value) => {
		const summary = summarize(
			state({ text: "a b c", showTarget: true, target: { unit: "words", value, rule: "around" } }),
		);
		expect(summary).toEqual({ count: "3 words", evaluation: null });
	});

	it("evaluates an active target", () => {
		const summary = summarize(
			state({ text: "a b c", showTarget: true, target: { unit: "words", value: 5, rule: "at-least" } }),
		);
		expect(summary.evaluation).toEqual({ state: "under", status: "2 to go" });
	});
});

describe("speakingTime", () => {
	const words = (count: number) => "word ".repeat(count);

	it.each([
		[0, null],
		[30, "About 10 sec aloud"],
		[150, "About 1 min aloud"],
		[150 * 90, "About 1 hr 30 min aloud"],
	])("%i words reads %s", (count, time) => {
		expect(speakingTime(state({ text: words(count) }))).toBe(time);
	});

	it("hides for whitespace-only text", () => {
		expect(speakingTime(state({ text: "  \n " }))).toBeNull();
	});

	it("shows for a characters target", () => {
		const target = { ...INITIAL_STATE.target, unit: "characters" } as const;
		expect(speakingTime(state({ text: words(150), target }))).toBe("About 1 min aloud");
	});

	it("hides for a spoken-time target, whose count already says it", () => {
		const target = { ...INITIAL_STATE.target, unit: "seconds" } as const;
		expect(speakingTime(state({ text: words(150), target }))).toBeNull();
	});
});
