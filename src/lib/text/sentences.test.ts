import { describe, expect, it } from "vitest";
import { sentences } from "./sentences";

const texts = (text: string) => sentences(text).map(({ start, end }) => text.slice(start, end));

describe("sentences", () => {
	it.each([
		["", []],
		["   \n\n ", []],
		["One. Two! Three?", ["One.", "Two!", "Three?"]],
		["No closing punctuation", ["No closing punctuation"]],
		["Dr. Smith went home. He slept.", ["Dr. Smith went home.", "He slept."]],
		["I met Mr. Jones and J. R. R. Tolkien. Fine.", ["I met Mr. Jones and J. R. R. Tolkien.", "Fine."]],
		["Use a tool, e.g. Hammer. Done.", ["Use a tool, e.g. Hammer.", "Done."]],
		["Wait... then it happened. Later.", ["Wait... then it happened.", "Later."]],
		["Wait… Then it happened.", ["Wait…", "Then it happened."]],
		['He said "Go." Then he left.', ['He said "Go."', "Then he left."]],
		['"Stop!" she said. Then she left.', ['"Stop!" she said.', "Then she left."]],
		["“Really?” he asked.", ["“Really?” he asked."]],
		["A heading\nThe first line of text", ["A heading", "The first line of text"]],
		["Ends a line with Dr.\nNext line", ["Ends a line with Dr.", "Next line"]],
		["One.\n\n— \n\nTwo.", ["One.", "Two."]],
	])("%j", (text, expected) => {
		expect(texts(text)).toEqual(expected);
	});

	it("counts the words in each sentence", () => {
		expect(sentences("One two three. Four five.").map(({ words }) => words)).toEqual([3, 2]);
	});

	it("stays fast at 20,000 words", () => {
		const text = "Dr. Smith said it’s “fine”, isn't it? She did not agree. ".repeat(1800);
		const started = performance.now();
		sentences(text);
		expect(performance.now() - started).toBeLessThan(100);
	});
});
