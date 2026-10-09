/*
 * Colour themes for the Prompt view. Presets come from the spec; "custom" uses Settings.custom.
 * The guide colour fills the reading band (at Settings.guideOpacity) and the arrow markers.
 */
import { normalizeHex } from "./color";
import type { Settings, ThemeId } from "./settings";

export interface ThemeColors {
	text: string;
	background: string;
	guide: string;
}

export interface Theme {
	label: string;
	colors: ThemeColors;
	/** High Contrast forces bold regardless of Settings.bold. */
	forceBold?: boolean;
}

export const THEMES: Record<Exclude<ThemeId, "custom">, Theme> = {
	classic: { label: "Classic prompter", colors: { text: "#ffd400", background: "#000000", guide: "#ffffff" } },
	studio: { label: "Studio", colors: { text: "#ffffff", background: "#000000", guide: "#fbeb4b" } },
	paper: { label: "Paper", colors: { text: "#111111", background: "#fafaf7", guide: "#fbeb4b" } },
	"high-contrast": {
		label: "High contrast",
		colors: { text: "#ffffff", background: "#000000", guide: "#ffffff" },
		forceBold: true,
	},
	night: { label: "Night", colors: { text: "#9a9a9a", background: "#0b0b0b", guide: "#ffffff" } },
	"green-room": { label: "Green room", colors: { text: "#e8ffe8", background: "#0f2a1c", guide: "#7cc778" } },
};

/** The Custom theme's own guide colour (marker yellow). Any other colour comes from Settings.guideColor. */
export const CUSTOM_GUIDE = "#fbeb4b";

export interface ResolvedTheme extends ThemeColors {
	bold: boolean;
}

/** The colours and weight the Prompt view should actually use. */
export function resolveTheme(settings: Settings): ResolvedTheme {
	const base =
		settings.theme === "custom"
			? { ...settings.custom, guide: CUSTOM_GUIDE, bold: settings.bold }
			: { ...THEMES[settings.theme].colors, bold: settings.bold || Boolean(THEMES[settings.theme].forceBold) };
	return settings.guideColor === "auto" ? base : { ...base, guide: settings.guideColor };
}

/** Quick picks for the guide colour: the logo's markers plus white. "auto" is offered separately. */
export const GUIDE_COLORS = [
	{ label: "Yellow", value: "#fbeb4b" },
	{ label: "White", value: "#ffffff" },
	{ label: "Green", value: "#7cc778" },
	{ label: "Pink", value: "#f499bf" },
	{ label: "Blue", value: "#5b8fdb" },
	{ label: "Orange", value: "#fa862d" },
] as const;

/** "#rrggbb" of `top` laid over `bottom` at `alpha` (0–1). Inputs must be valid #rrggbb. */
export function mixHex(top: string, bottom: string, alpha: number): string {
	const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
	const a = Math.min(1, Math.max(0, alpha));
	return `#${[0, 1, 2]
		.map((i) => Math.round(channel(top, i) * a + channel(bottom, i) * (1 - a)).toString(16).padStart(2, "0"))
		.join("")}`;
}

/**
 * Contrast of the text against the reading band (the guide colour at guideOpacity over the background).
 * Null when there is no band. Below MIN_CONTRAST the band makes the line being read harder to see.
 */
export function bandContrast(settings: Settings): number | null {
	if (settings.guide !== "band") return null;
	const { text, background, guide } = resolveTheme(settings);
	return contrastRatio(text, mixHex(guide, background, settings.guideOpacity));
}

/** WCAG AA for normal text. */
export const MIN_CONTRAST = 4.5;

/**
 * WCAG 2.x contrast ratio between two "#rrggbb" (or "#rgb") colours, 1–21.
 * Invalid input returns 1 (worst case), so a broken custom colour still warns.
 */
export function contrastRatio(a: string, b: string): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	if (la === null || lb === null) return 1;
	const [light, dark] = la > lb ? [la, lb] : [lb, la];
	return (light + 0.05) / (dark + 0.05);
}

/** WCAG relative luminance (0–1) of a hex colour, or null when it isn't one. */
export function relativeLuminance(color: string): number | null {
	const hex = normalizeHex(color);
	if (!hex) return null;
	const [r, g, b] = [1, 3, 5].map((i) => linearize(parseInt(hex.slice(i, i + 2), 16) / 255));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Which site theme suits UI drawn over this background: Paper on light grounds, Night shift on dark.
 * The one light/dark test for the prompter, used by the drawer and the toolbar alike.
 */
export function siteThemeFor(background: string): "light" | "dark" {
	return (relativeLuminance(background) ?? 0) > 0.4 ? "light" : "dark";
}

/** sRGB channel (0–1) to linear light. */
function linearize(c: number): number {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
