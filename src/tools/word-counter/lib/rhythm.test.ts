import { describe, expect, it } from "vitest";
import { sentences } from "../../../lib/text/sentences";
import {
	barAt,
	isLongSentence,
	LONG_SENTENCE_WORDS,
	rhythmSummaryText,
	sentenceDescription,
	stripGeometry,
	summarizeRhythm,
} from "./rhythm";

const words = (count: number) => Array.from({ length: count }, () => "Word").join(" ");
const textOf = (...lengths: number[]) => lengths.map((length) => `${words(length)}.`).join(" ");

describe("summarizeRhythm", () => {
	it("counts sentences, rounds the average and finds the longest", () => {
		const summary = summarizeRhythm(sentences(textOf(3, 4, 12)));
		expect(summary).toEqual({ sentences: 3, averageWords: 6, longestWords: 12 });
	});

	it("is all zeros without sentences", () => {
		expect(summarizeRhythm([])).toEqual({ sentences: 0, averageWords: 0, longestWords: 0 });
	});
});

describe("rhythmSummaryText", () => {
	it("reads as one line", () => {
		expect(rhythmSummaryText({ sentences: 24, averageWords: 17, longestWords: 48 })).toBe(
			"24 sentences · average 17 words · longest 48 words",
		);
	});

	it("uses singular nouns for one", () => {
		expect(rhythmSummaryText({ sentences: 1, averageWords: 1, longestWords: 1 })).toBe(
			"1 sentence · average 1 word · longest 1 word",
		);
	});

	it("says so when there is nothing to measure", () => {
		expect(rhythmSummaryText(summarizeRhythm([]))).toBe("No sentences yet");
	});
});

describe("isLongSentence", () => {
	it("is long only past the threshold", () => {
		const [atThreshold, past] = sentences(textOf(LONG_SENTENCE_WORDS, LONG_SENTENCE_WORDS + 1));
		expect(isLongSentence(atThreshold)).toBe(false);
		expect(isLongSentence(past)).toBe(true);
	});
});

describe("sentenceDescription", () => {
	it("names the position, length and opening words", () => {
		const text = "Short one. This sentence has more than six words in it.";
		expect(sentenceDescription(text, sentences(text), 1)).toBe(
			"Sentence 2 of 2 · 9 words · “This sentence has more than six…”",
		);
	});

	it("flags long sentences in words", () => {
		const text = textOf(LONG_SENTENCE_WORDS + 5);
		expect(sentenceDescription(text, sentences(text), 0)).toContain("long sentence");
	});
});

describe("stripGeometry", () => {
	it("draws one bar per sentence and keeps long ones apart", () => {
		const geometry = stripGeometry(sentences(textOf(5, 40, 5)));
		expect(geometry.width).toBe(3);
		expect(geometry.bars.match(/M/g)).toHaveLength(2);
		expect(geometry.longBars.match(/M/g)).toHaveLength(1);
		expect(geometry.longMarks.match(/M/g)).toHaveLength(1);
	});

	it("scales bar height to word count", () => {
		const geometry = stripGeometry(sentences(textOf(10, 40)));
		const heights = [...(geometry.bars + geometry.longBars).matchAll(/v([\d.]+)/g)].map((m) => Number(m[1]));
		expect(heights[1] / heights[0]).toBeCloseTo(4);
	});

	it("only draws the threshold when a sentence passes it", () => {
		expect(stripGeometry(sentences(textOf(5, LONG_SENTENCE_WORDS))).thresholdY).toBeNull();
		expect(stripGeometry(sentences(textOf(5, 60))).thresholdY).not.toBeNull();
	});
});

describe("barAt", () => {
	it.each([
		[0, 4, 0],
		[0.49, 4, 1],
		[1, 4, 3],
		[-0.2, 4, 0],
	])("maps %d of %d bars to bar %d", (fraction, count, expected) => {
		expect(barAt(fraction, count)).toBe(expected);
	});
});
