import { describe, expect, it } from "vitest";
import { formatClock, remainingSeconds } from "./timing";

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
