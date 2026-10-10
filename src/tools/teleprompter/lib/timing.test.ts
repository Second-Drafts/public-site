import { describe, expect, it } from "vitest";
import { countWords, formatClock, formatReadTime, readTimeSeconds, remainingSeconds, wordBucket } from "./timing";

describe("countWords", () => {
	it("counts whitespace-separated tokens", () => {
		expect(countWords("one two  three")).toBe(3);
		expect(countWords("line one\nline\ttwo")).toBe(4);
	});

	it("returns 0 for empty or blank input", () => {
		expect(countWords("")).toBe(0);
		expect(countWords("   ")).toBe(0);
		expect(countWords("\n\t ")).toBe(0);
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
		[601, "600+"],
		[5000, "600+"],
	])("%i words → %s", (words, bucket) => {
		expect(wordBucket(words)).toBe(bucket);
	});
});

describe("readTimeSeconds", () => {
	it("uses 150 words per minute by default", () => {
		expect(readTimeSeconds(150)).toBe(60);
		expect(readTimeSeconds(0)).toBe(0);
	});

	it("honours a custom wpm", () => {
		expect(readTimeSeconds(100, 200)).toBe(30);
	});
});

describe("remainingSeconds", () => {
	it("divides remaining distance by speed", () => {
		expect(remainingSeconds(300, 100)).toBe(3);
	});

	it("returns 0 when nothing remains", () => {
		expect(remainingSeconds(0, 100)).toBe(0);
		expect(remainingSeconds(-50, 100)).toBe(0);
	});

	it("returns Infinity when speed is 0 or less", () => {
		expect(remainingSeconds(300, 0)).toBe(Infinity);
		expect(remainingSeconds(300, -1)).toBe(Infinity);
	});
});

describe("formatClock", () => {
	it("formats minutes and seconds", () => {
		expect(formatClock(0)).toBe("0:00");
		expect(formatClock(42)).toBe("0:42");
		expect(formatClock(725)).toBe("12:05");
	});

	it("adds an hour field from 3600 seconds", () => {
		expect(formatClock(3729)).toBe("1:02:09");
	});

	it("rounds down to whole seconds", () => {
		expect(formatClock(42.99)).toBe("0:42");
	});

	it("treats negative values as 0", () => {
		expect(formatClock(-5)).toBe("0:00");
	});

	it("shows dashes for Infinity and NaN", () => {
		expect(formatClock(Infinity)).toBe("–:––");
		expect(formatClock(NaN)).toBe("–:––");
	});
});

describe("formatReadTime", () => {
	it("says under a minute below 60 seconds", () => {
		expect(formatReadTime(0)).toBe("Under a minute");
		expect(formatReadTime(59.9)).toBe("Under a minute");
		expect(formatReadTime(NaN)).toBe("Under a minute");
	});

	it("rounds to the nearest minute", () => {
		expect(formatReadTime(60)).toBe("About 1 min");
		expect(formatReadTime(89)).toBe("About 1 min");
		expect(formatReadTime(90)).toBe("About 2 min");
		expect(formatReadTime(7 * 60)).toBe("About 7 min");
	});

	it("switches to hours at 60 minutes", () => {
		expect(formatReadTime(3599)).toBe("About 1 hr");
		expect(formatReadTime(3600)).toBe("About 1 hr");
		expect(formatReadTime(3900)).toBe("About 1 hr 5 min");
		expect(formatReadTime(2 * 3600)).toBe("About 2 hr");
	});
});
