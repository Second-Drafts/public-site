import { describe, expect, it } from "vitest";
import { stageLook } from "../stage";
import { relativeLuminance } from "./color";
import { CUSTOM_GUIDE, siteThemeFor } from "./themes";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import { THEMES } from "./themes";

const settings = (patch: Partial<Settings> = {}): Settings => ({
	...DEFAULT_SETTINGS,
	custom: { ...DEFAULT_SETTINGS.custom },
	...patch,
});

describe("stageLook", () => {
	it("maps a preset theme and the layout settings to custom properties", () => {
		const look = stageLook(
			settings({
				theme: "studio",
				font: "mono",
				fontSize: 64,
				lineHeight: 1.6,
				columnWidth: 80,
				columnPosition: 0.25,
				guidePosition: 0.4,
				guideOpacity: 0.3,
				align: "center",
				guide: "arrows",
			}),
		);
		expect(look.vars["--tp-fg"]).toBe(THEMES.studio.colors.text);
		expect(look.vars["--tp-bg"]).toBe(THEMES.studio.colors.background);
		expect(look.vars["--tp-guide"]).toBe(THEMES.studio.colors.guide);
		expect(look.vars["--tp-size"]).toBe("64px");
		expect(look.vars["--tp-lh"]).toBe("1.6");
		expect(look.vars["--tp-col"]).toBe("80%");
		expect(look.vars["--tp-colpos"]).toBe("0.25");
		expect(look.vars["--tp-guide-pos"]).toBe("0.4");
		expect(look.vars["--tp-guide-opacity"]).toBe("0.3");
		expect(look.vars["--tp-font"]).toContain("monospace");
		expect(look.align).toBe("center");
		expect(look.guide).toBe("arrows");
	});

	it("uses the custom colours for the custom theme", () => {
		const custom = { text: "#123456", background: "#abcdef" };
		const look = stageLook(settings({ theme: "custom", custom }));
		expect(look.vars["--tp-fg"]).toBe(custom.text);
		expect(look.vars["--tp-bg"]).toBe(custom.background);
		expect(look.vars["--tp-guide"]).toBe(CUSTOM_GUIDE);
		expect(stageLook(settings({ theme: "custom", custom, guideColor: "#ff0000" })).vars["--tp-guide"]).toBe("#ff0000");
	});

	it("centres the column by default and passes the position through", () => {
		expect(stageLook(settings()).vars["--tp-colpos"]).toBe("0.5");
		expect(stageLook(settings({ columnPosition: 0 })).vars["--tp-colpos"]).toBe("0");
		expect(stageLook(settings({ columnPosition: 1 })).vars["--tp-colpos"]).toBe("1");
	});

	it("uses the guide colour override in every theme, and the theme's own for auto", () => {
		expect(stageLook(settings({ theme: "paper", guideColor: "#5b8fdb" })).vars["--tp-guide"]).toBe("#5b8fdb");
		expect(stageLook(settings({ theme: "paper", guideColor: "auto" })).vars["--tp-guide"]).toBe(
			THEMES.paper.colors.guide,
		);
	});

	it("scales by -1 on the axis that is mirrored or flipped", () => {
		const plain = stageLook(settings({ mirror: false, flip: false })).vars;
		expect([plain["--tp-sx"], plain["--tp-sy"]]).toEqual(["1", "1"]);
		const both = stageLook(settings({ mirror: true, flip: true })).vars;
		expect([both["--tp-sx"], both["--tp-sy"]]).toEqual(["-1", "-1"]);
		const flipOnly = stageLook(settings({ mirror: false, flip: true })).vars;
		expect([flipOnly["--tp-sx"], flipOnly["--tp-sy"]]).toEqual(["1", "-1"]);
	});

	it("follows the Bold setting alone, whatever the theme", () => {
		const regular = stageLook(settings({ theme: "studio", bold: false })).vars["--tp-weight"];
		const chosen = stageLook(settings({ theme: "studio", bold: true })).vars["--tp-weight"];
		const highContrastOff = stageLook(settings({ theme: "high-contrast", bold: false })).vars["--tp-weight"];
		expect(Number(chosen)).toBeGreaterThan(Number(regular));
		expect(highContrastOff).toBe(regular);
	});
});

describe("relativeLuminance", () => {
	it("is 0 for black and 1 for white", () => {
		expect(relativeLuminance("#000000")).toBeCloseTo(0, 6);
		expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 6);
		expect(relativeLuminance("#fff")).toBeCloseTo(1, 6);
	});

	it("matches the WCAG value for a mid grey", () => {
		// #777777: channel 0.4667 → linear 0.1845
		expect(relativeLuminance("#777777")).toBeCloseTo(0.1845, 3);
	});

	it("treats an invalid colour as black", () => {
		expect(relativeLuminance("not a colour")).toBeNull();
	});
});

describe("siteThemeFor", () => {
	it("puts Paper over light backgrounds and Night shift over dark ones", () => {
		expect(siteThemeFor(THEMES.paper.colors.background)).toBe("light");
		for (const id of ["classic", "studio", "high-contrast", "night", "green-room"] as const) {
			expect(siteThemeFor(THEMES[id].colors.background)).toBe("dark");
		}
	});

	it("switches at a luminance of about 0.4", () => {
		expect(siteThemeFor("#999999")).toBe("dark"); // L ≈ 0.318
		expect(siteThemeFor("#bbbbbb")).toBe("light"); // L ≈ 0.497
	});
});
