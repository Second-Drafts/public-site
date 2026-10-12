import { describe, expect, it } from "vitest";
import {
	countCharacters,
	countCharactersWithoutSpaces,
	countWords,
	formatSpeakingTime,
	limitOffset,
	measure,
	speakingSeconds,
	wordBucket,
	wordSpans,
	type Unit,
} from "./measure";

describe("countWords", () => {
	it.each([
		["", 0, "empty text"],
		["  \n\t ", 0, "whitespace only"],
		["one two  three", 3, "runs of spaces"],
		["line one\nline\ttwo", 4, "line breaks and tabs"],
		["don't", 1, "apostrophes join"],
		["well-known", 1, "a single hyphen joins, as in word processors"],
		["word—word", 2, "an em dash separates, as people read it"],
		["word — word", 2, "a spaced em dash is not a word"],
		["1990–2000", 2, "an en dash separates"],
		["word--word", 2, "a double hyphen stands in for an em dash"],
		["wait…what", 2, "an ellipsis separates"],
		["wait...what", 2, "three dots separate"],
		["3.14", 1, "a decimal"],
		["$1,000", 1, "money"],
		["10:30", 1, "a time"],
		["and/or", 1, "a slash joins"],
		["— ", 0, "a dash alone"],
		["…", 0, "an ellipsis alone"],
		["*", 0, "an asterisk alone"],
		["Tom & Jerry", 2, "a symbol alone is not a word"],
		["👍", 0, "an emoji alone is not a word"],
		['"Hello," she said.', 3, "punctuation stays with its word"],
		["https://example.com/a-path?q=1", 1, "a URL"],
		["someone@example.com", 1, "an email"],
		["日本語の文章です。", 4, "Japanese, which isn't written with spaces"],
		["Привет мир", 2, "Cyrillic"],
	])("%j → %i (%s)", (text, words) => {
		expect(countWords(text)).toBe(words);
	});
});

describe("wordSpans", () => {
	it("gives each word's position, with its punctuation", () => {
		const text = '"Hi," she—said';
		expect(wordSpans(text).map(({ start, end }) => text.slice(start, end))).toEqual(['"Hi,"', "she", "said"]);
	});

	it("splits text without spaces into words", () => {
		const text = "日本語の文章";
		expect(wordSpans(text).map(({ start, end }) => text.slice(start, end))).toEqual(["日本語", "の", "文章"]);
	});

	it("separates Latin words from the Japanese around them", () => {
		const text = "iPhoneを買った";
		expect(text.slice(wordSpans(text)[0].start, wordSpans(text)[0].end)).toBe("iPhone");
	});
});

describe("countCharacters", () => {
	it.each([
		["", 0],
		["abc", 3],
		["a b", 3],
		["👍", 1],
		["é", 1],
		["🇺🇸", 1],
		["👩‍👩‍👧", 1],
		["café 👍🏽", 6],
	])("%j → %i", (text, characters) => {
		expect(countCharacters(text)).toBe(characters);
	});
});

describe("countCharactersWithoutSpaces", () => {
	it("skips spaces, tabs and line breaks", () => {
		expect(countCharactersWithoutSpaces("a b\tc\nd 👍")).toBe(5);
	});
});

describe("measure", () => {
	it.each<[Unit, number]>([
		["words", 300],
		["characters", 300 * 5 - 1],
		["seconds", 120],
	])("measures in %s", (unit, amount) => {
		expect(measure("word ".repeat(300).trim(), unit)).toBe(amount);
	});
});

describe("limitOffset", () => {
	it.each<[string, Unit, number, number | null]>([
		["one two three", "words", 3, null],
		["one two three", "words", 4, null],
		["one two three", "words", 2, 8],
		["one two three", "words", 0, 0],
		["  one two", "words", 1, 6],
		["one—two", "words", 1, 4],
		["abc", "characters", 3, null],
		["abc", "characters", 2, 2],
		["👍👍👍", "characters", 2, 4],
		["éé", "characters", 1, 2],
		["🇺🇸🇬🇧", "characters", 1, 4],
		["word ".repeat(100), "seconds", 40, null],
		["word ".repeat(100), "seconds", 20, 250],
		["word ".repeat(100), "seconds", 7, 85],
	])("%j over %s limit %i → %s", (text, unit, limit, offset) => {
		expect(limitOffset(text, unit, limit)).toBe(offset);
	});

	it.each<[Unit, number]>([
		["words", 7],
		["characters", 12],
		["seconds", 4],
	])("leaves exactly the limit before the offset (%s)", (unit, limit) => {
		const text = "It's a well-known fact — 👍🏽 été, 日本語の文章です。 Then more words follow here, and more again.";
		const offset = limitOffset(text, unit, limit);
		expect(offset).not.toBeNull();
		const allowed = unit === "seconds" ? Math.floor((limit * 150) / 60) : limit;
		expect(measure(text.slice(0, offset!), unit === "seconds" ? "words" : unit)).toBe(allowed);
	});

	it("treats a fractional or negative limit as whole and at least 0", () => {
		expect(limitOffset("one two three", "words", 1.9)).toBe(4);
		expect(limitOffset("one two", "words", -3)).toBe(0);
	});

	it("stays fast at 20,000 words", () => {
		const text = "The quick brown fox — it’s “fine”, isn't it? ".repeat(2500);
		const started = performance.now();
		limitOffset(text, "words", 19_000);
		expect(performance.now() - started).toBeLessThan(50);
	});
});

describe("speakingSeconds", () => {
	it("uses 150 words per minute by default", () => {
		expect(speakingSeconds(150)).toBe(60);
		expect(speakingSeconds(0)).toBe(0);
	});

	it("honours a custom pace", () => {
		expect(speakingSeconds(100, 200)).toBe(30);
	});
});

describe("formatSpeakingTime", () => {
	it.each([
		[0, "About 5 sec"],
		[NaN, "About 5 sec"],
		[1, "About 5 sec"],
		[12, "About 10 sec"],
		[13, "About 15 sec"],
		[44, "About 45 sec"],
		[57.4, "About 55 sec"],
		[57.5, "About 1 min"],
		[60, "About 1 min"],
		[89, "About 1 min"],
		[90, "About 2 min"],
		[7 * 60, "About 7 min"],
		[3599, "About 1 hr"],
		[3600, "About 1 hr"],
		[3900, "About 1 hr 5 min"],
		[2 * 3600, "About 2 hr"],
	])("%d seconds → %s", (seconds, text) => {
		expect(formatSpeakingTime(seconds)).toBe(text);
	});
});

describe("wordBucket", () => {
	it.each([
		[0, "0-50"],
		[50, "0-50"],
		[51, "51-200"],
		[200, "51-200"],
		[201, "201-600"],
		[600, "201-600"],
		[601, "601-2000"],
		[2000, "601-2000"],
		[2001, "2001-10000"],
		[10000, "2001-10000"],
		[10001, "10000+"],
	])("%i words → %s", (words, bucket) => {
		expect(wordBucket(words)).toBe(bucket);
	});
});
