import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, LIMITS, validateSettings, type NumericSetting, type Settings } from "./settings";

const freshDefaults = (): Settings => ({ ...DEFAULT_SETTINGS, custom: { ...DEFAULT_SETTINGS.custom } });

describe("validateSettings", () => {
	it.each([undefined, null, "string", 42, true, [], [1, 2]])("returns defaults for %j", (input) => {
		expect(validateSettings(input)).toEqual(freshDefaults());
	});

	it("returns defaults for an empty object", () => {
		expect(validateSettings({})).toEqual(freshDefaults());
	});

	it("never returns DEFAULT_SETTINGS or its custom object", () => {
		for (const input of [undefined, {}, { custom: { text: "#fff" } }]) {
			const result = validateSettings(input);
			expect(result).not.toBe(DEFAULT_SETTINGS);
			expect(result.custom).not.toBe(DEFAULT_SETTINGS.custom);
			expect(Object.isFrozen(result)).toBe(false);
			expect(Object.isFrozen(result.custom)).toBe(false);
		}
		const a = validateSettings({});
		a.custom.text = "#000000";
		expect(DEFAULT_SETTINGS.custom.text).toBe("#ffffff");
		expect(validateSettings({}).custom.text).toBe("#ffffff");
	});

	describe("invalid values fall back per field", () => {
		it("enums", () => {
			const r = validateSettings({ font: "comic", theme: "evil", align: "right", guide: "laser" });
			expect(r.font).toBe(DEFAULT_SETTINGS.font);
			expect(r.theme).toBe(DEFAULT_SETTINGS.theme);
			expect(r.align).toBe(DEFAULT_SETTINGS.align);
			expect(r.guide).toBe(DEFAULT_SETTINGS.guide);
			expect(validateSettings({ font: 3, theme: null, align: {}, guide: ["band"] })).toEqual(freshDefaults());
		});

		it("accepts valid enums", () => {
			const r = validateSettings({ font: "mono", theme: "night", align: "center", guide: "arrows" });
			expect(r).toMatchObject({ font: "mono", theme: "night", align: "center", guide: "arrows" });
		});

		it("booleans", () => {
			const r = validateSettings({ bold: "yes", mirror: 1, flip: "true", countdown: 0 });
			expect(r.bold).toBe(DEFAULT_SETTINGS.bold);
			expect(r.mirror).toBe(DEFAULT_SETTINGS.mirror);
			expect(r.flip).toBe(DEFAULT_SETTINGS.flip);
			expect(r.countdown).toBe(DEFAULT_SETTINGS.countdown);
		});

		it("numbers given as strings", () => {
			const r = validateSettings({ fontSize: "60", speed: null, lineHeight: [] });
			expect(r.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
			expect(r.speed).toBe(DEFAULT_SETTINGS.speed);
			expect(r.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight);
		});

		it("custom that is not an object", () => {
			expect(validateSettings({ custom: "red" }).custom).toEqual(DEFAULT_SETTINGS.custom);
			expect(validateSettings({ custom: null }).custom).toEqual(DEFAULT_SETTINGS.custom);
			expect(validateSettings({ custom: [] }).custom).toEqual(DEFAULT_SETTINGS.custom);
		});
	});

	describe("numbers", () => {
		const keys = Object.keys(LIMITS) as NumericSetting[];

		it.each(keys)("%s is clamped at both ends", (key) => {
			const { min, max } = LIMITS[key];
			expect(validateSettings({ [key]: min - 1000 })[key]).toBe(min);
			expect(validateSettings({ [key]: max + 1000 })[key]).toBe(max);
			expect(validateSettings({ [key]: min })[key]).toBe(min);
			expect(validateSettings({ [key]: max })[key]).toBe(max);
		});

		it.each(keys)("%s falls back for NaN and Infinity", (key) => {
			for (const bad of [NaN, Infinity, -Infinity]) {
				expect(validateSettings({ [key]: bad })[key]).toBe(DEFAULT_SETTINGS[key]);
			}
		});

		it("does not round to the step", () => {
			expect(validateSettings({ fontSize: 57 }).fontSize).toBe(57);
			expect(validateSettings({ guidePosition: 0.4567 }).guidePosition).toBe(0.4567);
		});
	});

	describe("custom colours", () => {
		it("normalizes #rgb and uppercase to lowercase #rrggbb", () => {
			const r = validateSettings({ custom: { text: "#ABC", background: "#FFAA00", guide: "#0f0" } });
			expect(r.custom).toEqual({ text: "#aabbcc", background: "#ffaa00" });
		});

		it.each(["red", "#12", "#1234", "#12345", "#1234567", "#ggg", "ffffff", " #fff", "#fff ", "#fff;", "red; background:url(x)", 5, null])(
			"rejects %j per colour",
			(bad) => {
				const r = validateSettings({ custom: { text: bad, background: "#000", guide: bad } });
				expect(r.custom).toEqual({ text: "#ffffff", background: "#000000" });
			},
		);
	});

	it("drops unknown keys", () => {
		const r = validateSettings({ foo: 1, __proto__: { polluted: true }, custom: { text: "#fff", extra: "#000" }, font: "mono" });
		expect(Object.keys(r).sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
		expect(Object.keys(r.custom).sort()).toEqual(["background", "text"]);
		expect(r.font).toBe("mono");
	});

	it("round-trips a fully valid object unchanged", () => {
		const valid: Settings = {
			font: "hyperlegible",
			bold: true,
			theme: "custom",
			custom: { text: "#112233", background: "#445566" },
			fontSize: 80,
			lineHeight: 1.8,
			columnWidth: 55,
			align: "center",
			speed: 9,
			guide: "arrows",
			guidePosition: 0.5,
			guideOpacity: 0.35,
			mirror: true,
			flip: true,
			countdown: false,
			arrowKeys: "speed",
			columnPosition: 0.25,
			guideColor: "#7cc778",
		};
		const r = validateSettings(valid);
		expect(r).toEqual(valid);
		expect(r).not.toBe(valid);
		expect(r.custom).not.toBe(valid.custom);
		expect(validateSettings(r)).toEqual(valid);
	});

	it("keeps a valid arrow-key layout and falls back for anything else", () => {
		expect(validateSettings({ arrowKeys: "speed" }).arrowKeys).toBe("speed");
		expect(validateSettings({ arrowKeys: "paragraphs" }).arrowKeys).toBe("paragraphs");
		expect(validateSettings({ arrowKeys: "sideways" }).arrowKeys).toBe(DEFAULT_SETTINGS.arrowKeys);
		expect(validateSettings({}).arrowKeys).toBe("paragraphs");
	});

	it("accepts a guide colour of auto or a hex, normalised", () => {
		expect(validateSettings({ guideColor: "auto" }).guideColor).toBe("auto");
		expect(validateSettings({ guideColor: "#ABC" }).guideColor).toBe("#aabbcc");
		expect(validateSettings({ guideColor: "red" }).guideColor).toBe("auto");
		expect(validateSettings({}).guideColor).toBe("auto");
	});

	it("clamps the column position to 0–1 and defaults to centred", () => {
		expect(validateSettings({}).columnPosition).toBe(0.5);
		expect(validateSettings({ columnPosition: -2 }).columnPosition).toBe(0);
		expect(validateSettings({ columnPosition: 7 }).columnPosition).toBe(1);
		expect(validateSettings({ columnPosition: 0.3 }).columnPosition).toBe(0.3);
	});
});
