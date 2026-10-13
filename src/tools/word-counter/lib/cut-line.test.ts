import { describe, expect, it } from "vitest";
import { measure } from "../../../lib/text/measure";
import { cutAnnouncement, cutOffset } from "./cut-line";
import { INITIAL_STATE, type State } from "./state";
import type { Target } from "./target";

const fiveWords = "one two three four five";

function withTarget(text: string, target: Target, showTarget = true): State {
	return { ...INITIAL_STATE, text, showTarget, target };
}

describe("cutOffset", () => {
	it.each<[string, Target, number | null]>([
		["at most, over", { unit: "words", value: 3, rule: "at-most" }, 14],
		["at most, at the limit", { unit: "words", value: 5, rule: "at-most" }, null],
		["exactly, over", { unit: "words", value: 4, rule: "exactly" }, 19],
		["exactly, under", { unit: "words", value: 6, rule: "exactly" }, null],
		["a range cuts at its maximum", { unit: "words", value: 2, rule: "at-most", min: 1 }, 8],
		["at least never cuts", { unit: "words", value: 2, rule: "at-least" }, null],
		["around never cuts", { unit: "words", value: 2, rule: "around" }, null],
		["characters", { unit: "characters", value: 10, rule: "at-most" }, 10],
	])("%s", (_, target, offset) => {
		expect(cutOffset(withTarget(fiveWords, target))).toBe(offset);
	});

	it("is null when the target is switched off", () => {
		expect(cutOffset(withTarget(fiveWords, { unit: "words", value: 3, rule: "at-most" }, false))).toBeNull();
	});

	it("cuts a seconds target at the words spoken in that time", () => {
		const text = "word ".repeat(30).trim();
		const offset = cutOffset(withTarget(text, { unit: "seconds", value: 10, rule: "at-most" }));
		expect(offset).toBe(125);
		expect(measure(text.slice(0, offset!), "words")).toBe(25);
	});

	it("doesn't cut a seconds target the status line still calls at the limit", () => {
		const text = "word ".repeat(26).trim();
		expect(cutOffset(withTarget(text, { unit: "seconds", value: 10, rule: "at-most" }))).toBeNull();
	});
});

describe("cutAnnouncement", () => {
	it("quotes the last few words before the cut", () => {
		expect(cutAnnouncement("It was the best of times, it was", 25)).toBe(
			"Your limit falls after “…the best of times,”.",
		);
	});

	it("quotes everything when only a few words come before", () => {
		expect(cutAnnouncement("Short one. Then more", 10)).toBe("Your limit falls after “Short one.”.");
	});

	it("quotes a word cut part way through", () => {
		expect(cutAnnouncement("abcdef", 3)).toBe("Your limit falls after “abc”.");
	});

	it("folds line breaks into spaces", () => {
		expect(cutAnnouncement("First line\n\nsecond line and more", 18)).toBe(
			"Your limit falls after “First line second”.",
		);
	});

	it("says when the limit falls before the first word", () => {
		expect(cutAnnouncement("  hello", 2)).toBe("Your limit falls before the first word.");
	});

	it("marks a long unbroken run it had to trim", () => {
		const text = "x".repeat(500);
		expect(cutAnnouncement(text, 400)).toBe(`Your limit falls after “…${"x".repeat(200)}”.`);
	});
});
