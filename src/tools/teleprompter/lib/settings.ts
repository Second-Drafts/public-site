import { normalizeHex } from "./color";
import { clamp } from "./math";
import { isRecord } from "./object";

export const FONT_IDS = ["clean", "classic", "hyperlegible", "condensed", "display", "mono"] as const;
export type FontId = (typeof FONT_IDS)[number];

export const THEME_IDS = ["classic", "studio", "paper", "high-contrast", "night", "green-room", "custom"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const isThemeId = (value: string): value is ThemeId => (THEME_IDS as readonly string[]).includes(value);

export const GUIDE_MODES = ["band", "arrows", "off"] as const;
export type GuideMode = (typeof GUIDE_MODES)[number];

export type GuideColor = "auto" | `#${string}`;

export const ALIGNMENTS = ["left", "center"] as const;
export type Align = (typeof ALIGNMENTS)[number];

export const ARROW_KEY_LAYOUTS = ["paragraphs", "speed"] as const;
export type ArrowKeyLayout = (typeof ARROW_KEY_LAYOUTS)[number];

export interface CustomColors {
	text: string;
	background: string;
}

export interface Settings {
	font: FontId;
	bold: boolean;
	theme: ThemeId;
	custom: CustomColors;
	fontSize: number;
	lineHeight: number;
	columnWidth: number;
	columnPosition: number;
	align: Align;
	speed: number;
	guide: GuideMode;
	guidePosition: number;
	guideOpacity: number;
	guideColor: GuideColor;
	mirror: boolean;
	flip: boolean;
	countdown: boolean;
	arrowKeys: ArrowKeyLayout;
}

export const SPEED_STEPS = 12;

export const LIMITS = {
	fontSize: { min: 24, max: 120, step: 2 },
	lineHeight: { min: 1.2, max: 2.2, step: 0.1 },
	columnWidth: { min: 30, max: 100, step: 5 },
	columnPosition: { min: 0, max: 1, step: 0.05 },
	speed: { min: 1, max: SPEED_STEPS, step: 1 },
	guidePosition: { min: 0.1, max: 0.9, step: 0.01 },
	guideOpacity: { min: 0.05, max: 0.6, step: 0.05 },
} as const satisfies Record<string, { min: number; max: number; step: number }>;

export type NumericSetting = keyof typeof LIMITS;

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
	font: "clean",
	bold: false,
	theme: "classic",
	custom: Object.freeze({ text: "#ffffff", background: "#1a1a1a" }),
	fontSize: 56,
	lineHeight: 1.5,
	columnWidth: 70,
	columnPosition: 0.5,
	align: "left",
	speed: 4,
	guide: "band",
	guidePosition: 0.33,
	guideOpacity: 0.2,
	guideColor: "auto",
	mirror: false,
	flip: false,
	countdown: true,
	arrowKeys: "paragraphs",
}) as Readonly<Settings>;

export const SETTINGS_VERSION = 1;

export function validateSettings(input: unknown): Settings {
	const defaults = DEFAULT_SETTINGS;
	const raw = isRecord(input) ? input : {};
	const rawCustom = isRecord(raw.custom) ? raw.custom : {};

	return {
		font: pickEnum(FONT_IDS, raw.font, defaults.font),
		bold: pickBool(raw.bold, defaults.bold),
		theme: pickEnum(THEME_IDS, raw.theme, defaults.theme),
		custom: {
			text: pickColor(rawCustom.text, defaults.custom.text),
			background: pickColor(rawCustom.background, defaults.custom.background),
		},
		fontSize: pickNumber("fontSize", raw.fontSize, defaults.fontSize),
		lineHeight: pickNumber("lineHeight", raw.lineHeight, defaults.lineHeight),
		columnWidth: pickNumber("columnWidth", raw.columnWidth, defaults.columnWidth),
		columnPosition: pickNumber("columnPosition", raw.columnPosition, defaults.columnPosition),
		align: pickEnum(ALIGNMENTS, raw.align, defaults.align),
		speed: pickNumber("speed", raw.speed, defaults.speed),
		guide: pickEnum(GUIDE_MODES, raw.guide, defaults.guide),
		guidePosition: pickNumber("guidePosition", raw.guidePosition, defaults.guidePosition),
		guideOpacity: pickNumber("guideOpacity", raw.guideOpacity, defaults.guideOpacity),
		guideColor: raw.guideColor === "auto" ? "auto" : (pickColor(raw.guideColor, defaults.guideColor) as GuideColor),
		mirror: pickBool(raw.mirror, defaults.mirror),
		flip: pickBool(raw.flip, defaults.flip),
		countdown: pickBool(raw.countdown, defaults.countdown),
		arrowKeys: pickEnum(ARROW_KEY_LAYOUTS, raw.arrowKeys, defaults.arrowKeys),
	};
}

function pickEnum<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
	return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function pickBool(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function pickNumber(key: NumericSetting, value: unknown, fallback: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
	const { min, max } = LIMITS[key];
	return clamp(value, min, max);
}

function pickColor(value: unknown, fallback: string): string {
	return normalizeHex(value) ?? fallback;
}
