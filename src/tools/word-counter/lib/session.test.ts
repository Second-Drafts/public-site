import { describe, expect, it } from "vitest";
import { sessionProgressText } from "./session";

describe("sessionProgressText", () => {
	it.each([
		[412, "+412 this session"],
		[1240, "+1,240 this session"],
		[-86, "−86 this session (trimmed)"],
	])("%i reads %s", (change, text) => {
		expect(sessionProgressText(change)).toBe(text);
	});
});
