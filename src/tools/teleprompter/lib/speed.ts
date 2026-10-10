import { clamp } from "./math";
import { SPEED_STEPS } from "./settings";

export const SLOWEST_LPS = 0.1;
export const FASTEST_LPS = 2;

export function linesPerSecond(step: number): number {
	const clamped = Number.isFinite(step) ? clamp(Math.round(step), 1, SPEED_STEPS) : 1;
	return SLOWEST_LPS * (FASTEST_LPS / SLOWEST_LPS) ** ((clamped - 1) / (SPEED_STEPS - 1));
}

export function pixelsPerSecond(step: number, fontSize: number, lineHeight: number): number {
	return linesPerSecond(step) * fontSize * lineHeight;
}

