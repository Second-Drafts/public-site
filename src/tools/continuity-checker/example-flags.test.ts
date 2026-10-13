import { describe, expect, it } from "vitest";
import { EXAMPLE_FLAGS, splitAroundMark } from "./example-flags";

describe("example flags", () => {
	it("mark a phrase that appears in each quote", () => {
		for (const passage of EXAMPLE_FLAGS.flatMap((flag) => flag.passages)) {
			expect(passage.quote).toContain(passage.marked);
		}
	});
});

describe("splitAroundMark", () => {
	it("splits a quote around its marked phrase", () => {
		expect(splitAroundMark({ chapter: "Chapter 1", quote: "the green door", marked: "green" })).toEqual({
			before: "the ",
			marked: "green",
			after: " door",
		});
	});
});
