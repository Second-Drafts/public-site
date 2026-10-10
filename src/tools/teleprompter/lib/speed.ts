/*
 * Scroll speed. The steps are geometric, so each one feels like the same-sized change. Pace is in
 * lines, not pixels, so changing font size or line spacing keeps the reading pace roughly the same.
 *
 *   px per second = linesPerSecond(step) × fontSize × lineHeight
 */
import { clamp } from "./math";
import { SPEED_STEPS } from "./settings";

/** Pace at step 1 and at the top step, in lines per second. */
export const SLOWEST_LPS = 0.1;
export const FASTEST_LPS = 2;

/** Lines per second for a step (1…SPEED_STEPS). Out-of-range steps are clamped. */
export function linesPerSecond(step: number): number {
	const clamped = Number.isFinite(step) ? clamp(Math.round(step), 1, SPEED_STEPS) : 1;
	return SLOWEST_LPS * (FASTEST_LPS / SLOWEST_LPS) ** ((clamped - 1) / (SPEED_STEPS - 1));
}

export function pixelsPerSecond(step: number, fontSize: number, lineHeight: number): number {
	return linesPerSecond(step) * fontSize * lineHeight;
}

