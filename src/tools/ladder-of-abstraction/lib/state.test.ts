import { describe, expect, it } from "vitest";
import { MAX_RUNGS } from "./ladder";
import { questionFor } from "./questions";
import { INITIAL_STATE, validateState } from "./state";

describe("validateState", () => {
	it("falls back to a fresh ladder for anything unreadable", () => {
		expect(validateState(null)).toEqual(INITIAL_STATE);
		expect(validateState({ ladder: "nope", passageOrder: "sideways" })).toEqual(INITIAL_STATE);
		expect(validateState({ ladder: [] })).toEqual(INITIAL_STATE);
	});

	it("keeps saved rungs and fills in missing fields", () => {
		const state = validateState({
			ladder: [
				{ id: "a", text: "idea", reachedBy: "up" },
				{ id: "b", text: "detail", leftOutOfPassage: true },
			],
			passageOrder: "idea-first",
		});
		expect(state).toEqual({
			ladder: [
				{ id: "a", text: "idea", reachedBy: "up", leftOutOfPassage: false },
				{ id: "b", text: "detail", reachedBy: "start", leftOutOfPassage: true },
			],
			passageOrder: "idea-first",
		});
	});

	it("drops broken and repeated rungs and stops at the rung limit", () => {
		const rungs = Array.from({ length: MAX_RUNGS + 3 }, (_, index) => ({ id: `r${index}`, text: "" }));
		const state = validateState({ ladder: [{ id: "r0", text: "first" }, { text: "no id" }, ...rungs] });
		expect(state.ladder).toHaveLength(MAX_RUNGS);
		expect(state.ladder[0].text).toBe("first");
	});
});

describe("questionFor", () => {
	it("asks the same question of the same rung every time", () => {
		const rung = { id: "rung-7", text: "", reachedBy: "down" as const, leftOutOfPassage: false };
		expect(questionFor(rung)).toBe(questionFor({ ...rung }));
	});

	it("asks a so-what question of a rung reached by climbing", () => {
		expect(questionFor({ id: "x", text: "", reachedBy: "up", leftOutOfPassage: false })).toMatch(/line below/);
	});
});
