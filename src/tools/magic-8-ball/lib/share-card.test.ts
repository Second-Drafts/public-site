import { describe, expect, it } from "vitest";
import { curlyQuoted, wrapQuestion } from "./share-card";

const tenPixelsPerCharacter = (text: string) => text.length * 10;

describe("curlyQuoted", () => {
	it("wraps the trimmed question in curly quotes", () => {
		expect(curlyQuoted("  Will it rain? ")).toBe("“Will it rain?”");
	});
});

describe("wrapQuestion", () => {
	it("keeps a short question on one line", () => {
		expect(wrapQuestion("Will it rain", 200, 4, tenPixelsPerCharacter)).toEqual(["Will it rain"]);
	});

	it("breaks between words when a line is full", () => {
		expect(wrapQuestion("aaaa bbbb cccc dddd", 90, 4, tenPixelsPerCharacter)).toEqual(["aaaa bbbb", "cccc dddd"]);
	});

	it("ends the last line with an ellipsis when it runs out of lines", () => {
		const lines = wrapQuestion("aaaa bbbb cccc dddd eeee ffff", 90, 2, tenPixelsPerCharacter);
		expect(lines).toHaveLength(2);
		expect(lines[1].endsWith("…")).toBe(true);
		expect(lines[1].length * 10).toBeLessThanOrEqual(90);
	});

	it("shortens a single word wider than the line", () => {
		const [line] = wrapQuestion("supercalifragilistic", 80, 4, tenPixelsPerCharacter);
		expect(line).toBe("superca…");
	});
});
