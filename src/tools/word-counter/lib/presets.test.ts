import { describe, expect, it } from "vitest";
import { findPreset, PRESETS, presetGroups } from "./presets";
import { evaluateTarget, isUsable } from "./target";

describe("PRESETS", () => {
	it("has unique ids and usable targets", () => {
		expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length);
		expect(PRESETS.every((preset) => isUsable(preset.target))).toBe(true);
	});

	it("groups presets in the order they are listed", () => {
		expect(presetGroups().map((group) => group.name)).toEqual(["Fiction", "Submissions", "Essays", "Social", "Spoken"]);
	});

	it("reads the Common App essay as under, within and over", () => {
		const { target } = findPreset("common-app-essay")!;
		expect(evaluateTarget(200, target).state).toBe("under");
		expect(evaluateTarget(400, target).state).toBe("met");
		expect(evaluateTarget(700, target).state).toBe("over");
	});

	it("reads the spoken presets in time", () => {
		const { target } = findPreset("thirty-second-read")!;
		expect(evaluateTarget(15, target).status).toBe("15 sec to go");
	});
});
