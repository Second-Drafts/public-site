import { describe, expect, it } from "vitest";
import { summarizeSelection } from "./selection";
import { INITIAL_STATE, type State } from "./state";

const text = "one two three four five";
const withTarget = (overrides: Partial<State>): State => ({ ...INITIAL_STATE, text, ...overrides });

describe("summarizeSelection", () => {
	it("is null when nothing or only whitespace is selected", () => {
		expect(summarizeSelection(withTarget({}), { start: 3, end: 3 })).toBeNull();
		expect(summarizeSelection(withTarget({}), { start: 3, end: 4 })).toBeNull();
	});

	it("counts the selection against the total", () => {
		const summary = summarizeSelection(withTarget({}), { start: 0, end: 7 });
		expect(summary?.selected).toBe("2 of 5 words selected");
		expect(summary?.cut).toBeNull();
	});

	it("agrees with counting the selected text on its own", () => {
		const summary = summarizeSelection(withTarget({}), { start: 4, end: 13 });
		expect(summary?.selected).toBe("2 of 5 words selected");
	});

	it("uses singular when the total is one", () => {
		const summary = summarizeSelection(withTarget({ text: "hello" }), { start: 0, end: 5 });
		expect(summary?.selected).toBe("1 of 1 word selected");
	});

	it("counts characters when that is the unit", () => {
		const target = { unit: "characters", value: 10, rule: "at-most" } as const;
		const summary = summarizeSelection(withTarget({ target }), { start: 0, end: 3 });
		expect(summary?.selected).toBe("3 of 23 characters selected");
	});

	it("measures the text with the selection removed, so mid-word cuts differ from subtracting", () => {
		const state = withTarget({ text: "alpha beta gamma", showTarget: true });
		const midWord = summarizeSelection({ ...state, target: { ...state.target, value: 2 } }, { start: 8, end: 13 });
		expect(midWord?.cut?.landing).toBe("2 / 2 words");
		expect(midWord?.cut?.evaluation.state).toBe("met");
	});

	it("evaluates the remaining text against the target", () => {
		const state = withTarget({ showTarget: true, target: { unit: "words", value: 3, rule: "at-most" } });
		const summary = summarizeSelection(state, { start: 0, end: 8 });
		expect(summary?.cut?.landing).toBe("3 / 3 words");
		expect(summary?.cut?.evaluation.status).toBe("At the limit");
	});

	it("reports still over when the cut is not enough", () => {
		const state = withTarget({ showTarget: true, target: { unit: "words", value: 2, rule: "at-most" } });
		const summary = summarizeSelection(state, { start: 0, end: 4 });
		expect(summary?.cut?.evaluation).toEqual({ state: "over", status: "2 over" });
	});
});
