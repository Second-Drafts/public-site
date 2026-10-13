import { describe, expect, it } from "vitest";
import { fitTextInTriangle, type TriangleBox, type TriangleFitOptions } from "./triangle-text";

const box: TriangleBox = { width: 300, height: 260 };

const measure = (text: string, fontSize: number) => 0.6 * fontSize * text.length;

const options: TriangleFitOptions = {
	maxFontSize: 40,
	minFontSize: 12,
	lineHeight: 1.15,
	padding: 6,
	measure,
};

function topEdgeAvailableWidth(y: number, fontSize: number): number {
	const top = y - (fontSize * options.lineHeight) / 2;
	return (box.width * top) / box.height - 2 * options.padding;
}

function expectEveryLineToFit(text: string) {
	const { lines, fontSize } = fitTextInTriangle(text, box, options);
	for (const line of lines) {
		expect(measure(line.text, fontSize)).toBeLessThanOrEqual(topEdgeAvailableWidth(line.y, fontSize));
	}
}

describe("fitTextInTriangle", () => {
	it("keeps every line inside the triangle", () => {
		for (const text of [
			"YES.",
			"OUTLOOK GOOD.",
			"MY SOURCES SAY NO.",
			"THE COMMITTEE IS STILL READING.",
			"PATIENCE. THE DEPARTMENT IS PROCESSING.",
		]) {
			expectEveryLineToFit(text);
		}
	});

	it("sets a short answer on one line at the largest font", () => {
		const { lines, fontSize } = fitTextInTriangle("YES.", box, options);
		expect(lines).toHaveLength(1);
		expect(lines[0].text).toBe("YES.");
		expect(fontSize).toBe(options.maxFontSize);
	});

	it("wraps a long answer onto three or four lines", () => {
		const { lines } = fitTextInTriangle("PATIENCE. THE DEPARTMENT IS PROCESSING.", box, options);
		expect(lines.length).toBeGreaterThanOrEqual(3);
		expect(lines.length).toBeLessThanOrEqual(4);
	});

	it("shrinks the font for longer text", () => {
		const short = fitTextInTriangle("YES.", box, options);
		const medium = fitTextInTriangle("OUTLOOK NOT SO GOOD.", box, options);
		const long = fitTextInTriangle("PATIENCE. THE DEPARTMENT IS PROCESSING.", box, options);
		expect(medium.fontSize).toBeLessThan(short.fontSize);
		expect(long.fontSize).toBeLessThanOrEqual(medium.fontSize);
	});

	it("keeps all the words, in order", () => {
		const text = "THE COMMITTEE IS STILL READING.";
		const { lines } = fitTextInTriangle(text, box, options);
		expect(lines.map((line) => line.text).join(" ")).toBe(text);
	});

	it("stacks lines from top to bottom, one line height apart", () => {
		const { lines, fontSize } = fitTextInTriangle("THE COMMITTEE IS STILL READING.", box, options);
		for (let index = 1; index < lines.length; index++) {
			expect(lines[index].y - lines[index - 1].y).toBeCloseTo(fontSize * options.lineHeight);
		}
	});

	it("centres a one-line block near the preferred height", () => {
		const { lines } = fitTextInTriangle("YES.", box, options);
		expect(lines[0].y / box.height).toBeCloseTo(0.64, 1);
	});

	it("keeps the block inside the triangle's height", () => {
		const { lines, fontSize } = fitTextInTriangle("PATIENCE. THE DEPARTMENT IS PROCESSING.", box, options);
		const last = lines[lines.length - 1];
		expect(last.y + (fontSize * options.lineHeight) / 2).toBeLessThanOrEqual(box.height + 0.5);
	});

	it("falls back to the minimum font without throwing when nothing fits", () => {
		const tiny: TriangleBox = { width: 40, height: 40 };
		const { lines, fontSize } = fitTextInTriangle("THE COMMITTEE IS STILL READING.", tiny, options);
		expect(fontSize).toBe(options.minFontSize);
		expect(lines.length).toBeGreaterThan(0);
	});

	it("handles empty text", () => {
		expect(fitTextInTriangle("  ", box, options).lines).toEqual([]);
	});

	it("is deterministic", () => {
		const text = "READ IT ALOUD FIRST.";
		expect(fitTextInTriangle(text, box, options)).toEqual(fitTextInTriangle(text, box, options));
	});
});
