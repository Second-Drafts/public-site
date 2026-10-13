import { describe, expect, it } from "vitest";
import { sessionChange, sessionProgressText } from "./session";

describe("sessionChange", () => {
	it.each([
		[100, 512, 412],
		[100, 14, -86],
		[100, 100, 0],
	])("from %i to %i is %i", (baseline, current, change) => {
		expect(sessionChange(baseline, current)).toBe(change);
	});
});

describe("sessionProgressText", () => {
	it.each([
		[412, "+412 this session"],
		[1240, "+1,240 this session"],
		[-86, "−86 this session (trimmed)"],
	])("%i reads %s", (change, text) => {
		expect(sessionProgressText(change)).toBe(text);
	});
});
