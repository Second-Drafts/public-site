import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, validateSettings } from "./settings";

describe("validateSettings", () => {
	it("falls back to defaults for anything that isn't a record", () => {
		for (const input of [undefined, null, "x", 3, []]) expect(validateSettings(input)).toEqual(DEFAULT_SETTINGS);
	});

	it("keeps a valid value", () => {
		const saved = {
			showTarget: true,
			target: { unit: "characters", rule: "around", value: 280, min: 200 },
			presetId: "tweet",
		};
		expect(validateSettings(saved)).toEqual(saved);
	});

	it("replaces only the fields that are bad", () => {
		const result = validateSettings({
			showTarget: "yes",
			target: { unit: "pages", rule: "exactly", value: -4 },
			presetId: "essay",
		});
		expect(result.showTarget).toBe(false);
		expect(result.target).toEqual({ ...DEFAULT_SETTINGS.target, rule: "exactly" });
		expect(result.presetId).toBe("essay");
	});

	it("drops a range minimum that isn't below the value", () => {
		const { target } = validateSettings({ target: { ...DEFAULT_SETTINGS.target, value: 100, min: 100 } });
		expect(target.min).toBeUndefined();
	});
});
