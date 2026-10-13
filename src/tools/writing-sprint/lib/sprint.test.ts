import { describe, expect, it } from "vitest";
import {
	fractionElapsed,
	formatClock,
	isValidSprintLength,
	pauseSprint,
	resumeSprint,
	sprintSummary,
	sprintWords,
	startSprint,
	timeLeftMs,
} from "./sprint";

const minute = 60_000;

describe("timeLeftMs", () => {
	const sprint = startSprint(10, 1_000_000, 0);

	it("counts down from the timestamp, however long the tab slept", () => {
		expect(timeLeftMs(sprint, 1_000_000)).toBe(10 * minute);
		expect(timeLeftMs(sprint, 1_000_000 + 7 * minute)).toBe(3 * minute);
	});

	it("stops at zero", () => {
		expect(timeLeftMs(sprint, 1_000_000 + 30 * minute)).toBe(0);
	});
});

describe("pausing", () => {
	it("freezes the time left for as long as the pause lasts", () => {
		const paused = pauseSprint(startSprint(10, 0, 0), 4 * minute);
		expect(timeLeftMs(paused, 4 * minute)).toBe(6 * minute);
		expect(timeLeftMs(paused, 90 * minute)).toBe(6 * minute);
	});

	it("carries on from where it stopped when resumed", () => {
		const paused = pauseSprint(startSprint(10, 0, 0), 4 * minute);
		const resumed = resumeSprint(paused, 50 * minute);
		expect(timeLeftMs(resumed, 52 * minute)).toBe(4 * minute);
	});

	it("adds up several runs", () => {
		let sprint = startSprint(10, 0, 0);
		sprint = pauseSprint(sprint, 2 * minute);
		sprint = resumeSprint(sprint, 10 * minute);
		sprint = pauseSprint(sprint, 13 * minute);
		sprint = resumeSprint(sprint, 20 * minute);
		expect(timeLeftMs(sprint, 22 * minute)).toBe(3 * minute);
	});

	it("ignores pausing a paused sprint and resuming a running one", () => {
		const running = startSprint(10, 0, 0);
		expect(resumeSprint(running, 5 * minute)).toBe(running);
		const paused = pauseSprint(running, minute);
		expect(pauseSprint(paused, 5 * minute)).toBe(paused);
	});
});

describe("fractionElapsed", () => {
	it("runs from 0 to 1", () => {
		const sprint = startSprint(10, 0, 0);
		expect(fractionElapsed(sprint, 0)).toBe(0);
		expect(fractionElapsed(sprint, 5 * minute)).toBe(0.5);
		expect(fractionElapsed(sprint, 99 * minute)).toBe(1);
	});
});

describe("sprintWords", () => {
	const sprint = startSprint(25, 0, 300);

	it("excludes words that were already there", () => {
		expect(sprintWords(sprint, 300)).toBe(0);
		expect(sprintWords(sprint, 940)).toBe(640);
	});

	it("does not go negative when the draft is cut", () => {
		expect(sprintWords(sprint, 120)).toBe(0);
	});
});

describe("formatClock", () => {
	it.each([
		[25 * minute, "25:00"],
		[61_000, "1:01"],
		[59_001, "1:00"],
		[1, "0:01"],
		[0, "0:00"],
	])("%i ms reads %s", (ms, clock) => {
		expect(formatClock(ms)).toBe(clock);
	});
});

describe("sprintSummary", () => {
	it.each([
		[25, 640, "25 minutes · 640 words"],
		[1, 1, "1 minute · 1 word"],
		[10, 0, "10 minutes · 0 words"],
		[15, 1200, "15 minutes · 1,200 words"],
	])("%i minutes, %i words", (minutes, words, text) => {
		expect(sprintSummary({ minutes, words })).toBe(text);
	});
});

describe("isValidSprintLength", () => {
	it.each([
		[1, true],
		[45, true],
		[180, true],
		[0, false],
		[181, false],
		[2.5, false],
		[Number.NaN, false],
	])("%s is %s", (minutes, valid) => {
		expect(isValidSprintLength(minutes)).toBe(valid);
	});
});
