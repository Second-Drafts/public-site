import { clamp } from "./math";

/** Lowercase "#rrggbb" for a "#rgb" or "#rrggbb" colour (any case), or null for anything else. */
export function normalizeHex(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
	if (!match) return null;
	const hex = match[1].toLowerCase();
	return `#${hex.length === 3 ? hex.replace(/./g, "$&$&") : hex}`;
}

/** "#rrggbb" of `top` laid over `bottom` at `alpha` (0–1). Inputs must be valid #rrggbb. */
export function mixHex(top: string, bottom: string, alpha: number): string {
	const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
	const a = clamp(alpha, 0, 1);
	return `#${[0, 1, 2]
		.map((i) => Math.round(channel(top, i) * a + channel(bottom, i) * (1 - a)).toString(16).padStart(2, "0"))
		.join("")}`;
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

/** sRGB channel (0–1) to linear light. */
function linearize(c: number): number {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
