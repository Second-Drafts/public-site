import { describe, expect, it } from "vitest";
import { SPEED_STEPS } from "./settings";
import { FASTEST_LPS, SLOWEST_LPS, linesPerSecond, pixelsPerSecond } from "./speed";

describe("linesPerSecond", () => {
	it("starts at the slowest pace and ends at the fastest", () => {
		expect(linesPerSecond(1)).toBe(SLOWEST_LPS);
		expect(linesPerSecond(SPEED_STEPS)).toBeCloseTo(FASTEST_LPS, 10);
	});

	it("increases strictly with each step", () => {
		for (let step = 1; step < SPEED_STEPS; step++) {
			expect(linesPerSecond(step + 1)).toBeGreaterThan(linesPerSecond(step));
		}
	});

	it("uses a constant ratio between consecutive steps (log-even)", () => {
		const ratio = linesPerSecond(2) / linesPerSecond(1);
		for (let step = 1; step < SPEED_STEPS; step++) {
			expect(linesPerSecond(step + 1) / linesPerSecond(step)).toBeCloseTo(ratio, 10);
		}
	});

	it("clamps out-of-range steps", () => {
		expect(linesPerSecond(0)).toBe(linesPerSecond(1));
		expect(linesPerSecond(99)).toBe(linesPerSecond(SPEED_STEPS));
	});

	it("rounds fractional steps to the nearest integer", () => {
		expect(linesPerSecond(2.6)).toBe(linesPerSecond(3));
	});

	it("treats NaN as step 1", () => {
		expect(linesPerSecond(NaN)).toBe(SLOWEST_LPS);
	});
});

describe("pixelsPerSecond", () => {
	it("is lines per second times font size times line height", () => {
		expect(pixelsPerSecond(5, 56, 1.5)).toBeCloseTo(linesPerSecond(5) * 56 * 1.5, 10);
	});
});
