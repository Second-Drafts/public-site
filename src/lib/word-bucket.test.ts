import { describe, expect, it } from "vitest";
import { wordBucket } from "./word-bucket";

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
		expect(wordBucket("word ".repeat(words))).toBe(bucket);
	});
});
