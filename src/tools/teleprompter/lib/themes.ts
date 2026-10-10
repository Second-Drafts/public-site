import { contrastRatio, mixHex, relativeLuminance } from "./color";
import type { Settings, ThemeId } from "./settings";

export interface ThemeColors {
	text: string;
	background: string;
	guide: string;
}

export interface Theme {
	label: string;
	colors: ThemeColors;
	bold?: true;
}

export const THEMES: Record<Exclude<ThemeId, "custom">, Theme> = {
	classic: { label: "Classic prompter", colors: { text: "#ffd400", background: "#000000", guide: "#ffffff" } },
	studio: { label: "Studio", colors: { text: "#ffffff", background: "#000000", guide: "#fbeb4b" } },
	paper: { label: "Paper", colors: { text: "#111111", background: "#fafaf7", guide: "#fbeb4b" } },
	"high-contrast": {
		label: "High contrast",
		colors: { text: "#ffffff", background: "#000000", guide: "#ffffff" },
		bold: true,
	},
	night: { label: "Night", colors: { text: "#9a9a9a", background: "#0b0b0b", guide: "#ffffff" } },
	"green-room": { label: "Green room", colors: { text: "#e8ffe8", background: "#0f2a1c", guide: "#7cc778" } },
};

export const CUSTOM_GUIDE = "#fbeb4b";

export function resolveTheme(settings: Settings): ThemeColors {
	const base = settings.theme === "custom" ? { ...settings.custom, guide: CUSTOM_GUIDE } : THEMES[settings.theme].colors;
	return settings.guideColor === "auto" ? base : { ...base, guide: settings.guideColor };
}

export function pickTheme(theme: ThemeId): Partial<Settings> {
	return theme !== "custom" && THEMES[theme].bold ? { theme, bold: true } : { theme };
}

export const GUIDE_COLORS = [
	{ label: "Yellow", value: "#fbeb4b" },
	{ label: "White", value: "#ffffff" },
	{ label: "Green", value: "#7cc778" },
	{ label: "Pink", value: "#f499bf" },
	{ label: "Blue", value: "#5b8fdb" },
	{ label: "Orange", value: "#fa862d" },
] as const;

export function bandContrast(settings: Settings): number | null {
	if (settings.guide !== "band") return null;
	const { text, background, guide } = resolveTheme(settings);
	return contrastRatio(text, mixHex(guide, background, settings.guideOpacity));
}

export function siteThemeFor(background: string): "light" | "dark" {
	return (relativeLuminance(background) ?? 0) > 0.4 ? "light" : "dark";
}
