import { describe, expect, it } from "vitest";
import {
	MAX_RUNGS,
	addRung,
	editRung,
	isBlank,
	ladderText,
	passageRungs,
	passageText,
	removeRung,
	startingRung,
	toggleInPassage,
	type Ladder,
} from "./ladder";

function ladderOf(...texts: string[]): Ladder {
	return texts.map((text, index) => ({ ...startingRung(`r${index}`), text }));
}

const ids = (ladder: Ladder) => ladder.map((rung) => rung.id);

describe("addRung", () => {
	const ladder = ladderOf("idea", "detail");

	it("puts a so-what rung directly above the rung it came from", () => {
		const climbed = addRung(ladder, "r1", "up", "new");
		expect(ids(climbed)).toEqual(["r0", "new", "r1"]);
		expect(climbed[1]).toMatchObject({ text: "", reachedBy: "up" });
	});

	it("puts a like-what rung directly below the rung it came from", () => {
		expect(ids(addRung(ladder, "r0", "down", "new"))).toEqual(["r0", "new", "r1"]);
		expect(ids(addRung(ladder, "r1", "down", "new"))).toEqual(["r0", "r1", "new"]);
	});

	it("stops adding at the top rung count", () => {
		const full = ladderOf(...Array.from({ length: MAX_RUNGS }, (_, index) => `line ${index}`));
		expect(addRung(full, "r0", "up", "new")).toBe(full);
	});

	it("leaves the ladder alone when the rung is gone", () => {
		expect(addRung(ladder, "missing", "up", "new")).toBe(ladder);
	});
});

describe("editRung and removeRung", () => {
	it("changes only the edited rung", () => {
		expect(editRung(ladderOf("a", "b"), "r1", "c").map((rung) => rung.text)).toEqual(["a", "c"]);
	});

	it("removes a rung", () => {
		expect(ids(removeRung(ladderOf("a", "b"), "r0"))).toEqual(["r1"]);
	});

	it("empties the last rung instead of removing it", () => {
		const left = toggleInPassage(ladderOf("only"), "r0");
		expect(removeRung(left, "r0")).toEqual([startingRung("r0")]);
	});
});

describe("passage", () => {
	const ladder = ladderOf("Big idea.", "  ", "Middle.", "Small detail.");

	it("reads from the bottom up, detail first", () => {
		expect(passageText(ladder, "detail-first")).toBe("Small detail. Middle. Big idea.");
	});

	it("reads from the top down, idea first", () => {
		expect(passageText(ladder, "idea-first")).toBe("Big idea. Middle. Small detail.");
	});

	it("leaves out struck rungs but still lists them", () => {
		const struck = toggleInPassage(ladder, "r2");
		expect(passageText(struck, "idea-first")).toBe("Big idea. Small detail.");
		expect(ids(passageRungs(struck, "idea-first"))).toEqual(["r0", "r2", "r3"]);
	});

	it("skips blank rungs", () => {
		expect(ids(passageRungs(ladder, "detail-first"))).toEqual(["r3", "r2", "r0"]);
	});
});

describe("ladderText and isBlank", () => {
	it("copies written rungs top to bottom, one per line", () => {
		expect(ladderText(ladderOf(" idea ", "", "detail"))).toBe("idea\ndetail");
	});

	it("treats a ladder of empty rungs as blank", () => {
		expect(isBlank(ladderOf("", "  "))).toBe(true);
		expect(isBlank(ladderOf("", "x"))).toBe(false);
	});
});
