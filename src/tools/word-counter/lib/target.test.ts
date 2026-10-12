import { describe, expect, it } from "vitest";
import type { Unit } from "../../../lib/text/measure";
import { evaluateTarget, isUsable, type Rule, type Target, type TargetState } from "./target";

const target = (rule: Rule, value: number, unit: Unit = "words", min?: number): Target => ({ unit, value, rule, min });

describe("evaluateTarget", () => {
	it.each<[string, number, Target, TargetState, string]>([
		["at most, under", 62, target("at-most", 100), "met", "38 left"],
		["at most, at", 100, target("at-most", 100), "met", "At the limit"],
		["at most, over", 112, target("at-most", 100), "over", "12 over"],
		["at least, under", 62, target("at-least", 100), "under", "38 to go"],
		["at least, at", 100, target("at-least", 100), "met", "Target reached"],
		["at least, over", 112, target("at-least", 100), "met", "Target reached"],
		["exactly, under", 99, target("exactly", 100), "under", "1 to go"],
		["exactly, at", 100, target("exactly", 100), "met", "On target"],
		["exactly, over", 101, target("exactly", 100), "over", "1 over"],
		["around, far under", 80, target("around", 100), "under", "20 to go"],
		["around, just under", 96, target("around", 100), "met", "Within 4%"],
		["around, at", 100, target("around", 100), "met", "On target"],
		["around, at the tolerance", 110, target("around", 100), "met", "Within 10%"],
		["around, far over", 111, target("around", 100), "over", "11 over"],
		["a range, under its minimum", 200, target("at-most", 650, "words", 250), "under", "50 to go"],
		["a range, inside", 400, target("at-most", 650, "words", 250), "met", "250 left"],
		["a range, over", 700, target("at-most", 650, "words", 250), "over", "50 over"],
		["large numbers", 1240, target("at-most", 1000), "over", "240 over"],
		["large differences", 0, target("at-least", 12000), "under", "12,000 to go"],
		["characters", 312, target("at-most", 300, "characters"), "over", "12 over"],
		["seconds, under", 45, target("at-least", 60, "seconds"), "under", "15 sec to go"],
		["seconds, over by minutes", 400, target("at-most", 300, "seconds"), "over", "1 min 40 sec over"],
		["seconds, rounded to whole seconds", 59.6, target("exactly", 60, "seconds"), "met", "On target"],
		["seconds, around", 28.4, target("around", 30, "seconds"), "met", "Within 7%"],
	])("%s", (_, measured, goal, state, status) => {
		expect(evaluateTarget(measured, goal)).toEqual({ state, status });
	});
});

describe("isUsable", () => {
	it.each([
		[240, true],
		[0.5, true],
		[0, false],
		[-5, false],
		[NaN, false],
		[Infinity, false],
	])("%d → %s", (value, usable) => {
		expect(isUsable(target("at-most", value))).toBe(usable);
	});
});
