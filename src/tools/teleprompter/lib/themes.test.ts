import { describe, expect, it } from "vitest";
import { validateSettings } from "./settings";
import { contrastRatio, MIN_CONTRAST, mixHex } from "./color";
import { THEMES, bandContrast, pickTheme, resolveTheme } from "./themes";

describe("contrastRatio", () => {
	it("gives 21 for black on white", () => {
		expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 10);
	});

	it("gives 1 for the same colour", () => {
		expect(contrastRatio("#3a7bd5", "#3a7bd5")).toBe(1);
	});

	it("accepts short #rgb form", () => {
		expect(contrastRatio("#fff", "#ffffff")).toBe(1);
		expect(contrastRatio("#fff", "#000")).toBeCloseTo(21, 10);
	});

	it("is case-insensitive", () => {
		expect(contrastRatio("#FFD400", "#000000")).toBeCloseTo(contrastRatio("#ffd400", "#000000"), 10);
	});

	it("does not depend on argument order", () => {
		expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(contrastRatio("#ffffff", "#777777"), 10);
	});

	it("matches a known pair", () => {
		expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
	});

	it("returns 1 for invalid input", () => {
		expect(contrastRatio("not a colour", "#ffffff")).toBe(1);
		expect(contrastRatio("#ffffff", "#ffff")).toBe(1);
		expect(contrastRatio("#gggggg", "#000000")).toBe(1);
		expect(contrastRatio("", "")).toBe(1);
	});
});

describe("THEMES contrast", () => {
	it.each(Object.entries(THEMES))("%s text on background meets WCAG AA", (_id, theme) => {
		const ratio = contrastRatio(theme.colors.text, theme.colors.background);
		expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
	});

	it("night is the dimmest preset but still passes AA (about 7:1)", () => {
		const night = THEMES.night.colors;
		const ratio = contrastRatio(night.text, night.background);
		expect(ratio).toBeCloseTo(6.99, 1);
		const others = Object.entries(THEMES)
			.filter(([id]) => id !== "night")
			.map(([, theme]) => contrastRatio(theme.colors.text, theme.colors.background));
		expect(ratio).toBeLessThan(Math.min(...others));
	});
});

describe("guide colour and band contrast", () => {
	const base = validateSettings({});

	it("uses the theme's guide colour on auto and the override otherwise", () => {
		expect(resolveTheme({ ...base, theme: "classic" }).guide).toBe(THEMES.classic.colors.guide);
		expect(resolveTheme({ ...base, theme: "classic", guideColor: "#f499bf" }).guide).toBe("#f499bf");
		expect(resolveTheme({ ...base, theme: "custom", guideColor: "#7cc778" }).guide).toBe("#7cc778");
	});

	it("mixes colours like a translucent layer", () => {
		expect(mixHex("#ffffff", "#000000", 0)).toBe("#000000");
		expect(mixHex("#ffffff", "#000000", 1)).toBe("#ffffff");
		expect(mixHex("#ffffff", "#000000", 0.5)).toBe("#808080");
	});

	it("reports band contrast only for the band", () => {
		expect(bandContrast({ ...base, guide: "arrows" })).toBeNull();
		expect(bandContrast({ ...base, guide: "off" })).toBeNull();
		// Default Classic band (white at 20% on black) keeps yellow text readable.
		expect(bandContrast(base)!).toBeGreaterThanOrEqual(MIN_CONTRAST);
		// A yellow band at 60% under yellow text does not.
		expect(bandContrast({ ...base, guideColor: "#ffd400", guideOpacity: 0.6 })!).toBeLessThan(MIN_CONTRAST);
	});
});

describe("pickTheme", () => {
	it("turns Bold on with High contrast, as a shortcut", () => {
		expect(pickTheme("high-contrast")).toEqual({ theme: "high-contrast", bold: true });
	});

	it("leaves Bold alone for every other theme", () => {
		for (const id of ["classic", "studio", "paper", "night", "green-room", "custom"] as const) {
			expect(pickTheme(id)).toEqual({ theme: id });
		}
	});

});
