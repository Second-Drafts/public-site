import { describe, expect, it } from "vitest";
import { highlightSegments, mirrorLines, type HighlightSegment, type HighlightSpan } from "./text-highlights";

const segmentsOf = (entries: [string, HighlightSpan[]][]) => highlightSegments(new Map(entries));

function segment(start: number, end: number, kinds: string[], starts: string[] = []): HighlightSegment {
	return { start, end, kinds, starts };
}

describe("highlightSegments", () => {
	it("is empty without spans", () => {
		expect(segmentsOf([])).toEqual([]);
		expect(segmentsOf([["cut", []]])).toEqual([]);
	});

	it("keeps separate spans of one kind in order, each marked where it begins", () => {
		const spans = [
			{ start: 10, end: 12 },
			{ start: 2, end: 5 },
		];
		expect(segmentsOf([["sentence", spans]])).toEqual([
			segment(2, 5, ["sentence"], ["sentence"]),
			segment(10, 12, ["sentence"], ["sentence"]),
		]);
	});

	it("splits overlapping kinds into segments listing every kind that covers them", () => {
		expect(
			segmentsOf([
				["cut", [{ start: 5, end: 20 }]],
				["sentence", [{ start: 0, end: 10 }]],
			]),
		).toEqual([
			segment(0, 5, ["sentence"], ["sentence"]),
			segment(5, 10, ["cut", "sentence"], ["cut"]),
			segment(10, 20, ["cut"]),
		]);
	});

	it("marks two kinds beginning together", () => {
		expect(
			segmentsOf([
				["cut", [{ start: 3, end: 6 }]],
				["sentence", [{ start: 3, end: 6 }]],
			]),
		).toEqual([segment(3, 6, ["cut", "sentence"], ["cut", "sentence"])]);
	});

	it("merges overlapping and touching spans of the same kind", () => {
		const spans = [
			{ start: 0, end: 6 },
			{ start: 4, end: 8 },
			{ start: 8, end: 9 },
		];
		expect(segmentsOf([["cut", spans]])).toEqual([segment(0, 9, ["cut"], ["cut"])]);
	});

	it("ignores empty and reversed spans", () => {
		const spans = [
			{ start: 3, end: 3 },
			{ start: 7, end: 2 },
		];
		expect(segmentsOf([["cut", spans]])).toEqual([]);
	});
});

describe("mirrorLines", () => {
	const cut = (start: number, end: number, begins = false) => segment(start, end, ["cut"], begins ? ["cut"] : []);

	it("splits the text at line breaks, keeping empty lines", () => {
		expect(mirrorLines("one\n\ntwo\n", []).map((line) => line.text)).toEqual(["one", "", "two", ""]);
	});

	it("gives each line the part of a segment that falls on it, in line offsets", () => {
		const lines = mirrorLines("abc\ndef\n\nghi", [cut(2, 13, true)]);
		expect(lines.map((line) => line.highlights)).toEqual([[cut(2, 3, true)], [cut(0, 3)], [], [cut(0, 3)]]);
	});

	it("keeps several segments on one line apart", () => {
		const both = segment(3, 5, ["cut", "sentence"], ["sentence"]);
		const [line] = mirrorLines("abcdef", [cut(0, 1, true), both]);
		expect(line.highlights).toEqual([cut(0, 1, true), both]);
	});

	it("drops segments past the end of the text", () => {
		expect(mirrorLines("abc", [cut(1, 10), cut(20, 30)])[0].highlights).toEqual([cut(1, 3)]);
	});

	it("keeps a line's key when an earlier line changes length", () => {
		const before = mirrorLines("one two\nthree four", [cut(4, 18, true)]);
		const after = mirrorLines("one, two\nthree four", [cut(5, 19, true)]);
		expect(after[0].key).not.toBe(before[0].key);
		expect(after[1].key).toBe(before[1].key);
	});

	it("changes a line's key when its highlight moves or starts there", () => {
		const highlighted = mirrorLines("one two", [cut(4, 7)])[0].key;
		expect(mirrorLines("one two", [cut(3, 7)])[0].key).not.toBe(highlighted);
		expect(mirrorLines("one two", [cut(4, 7, true)])[0].key).not.toBe(highlighted);
	});
});
