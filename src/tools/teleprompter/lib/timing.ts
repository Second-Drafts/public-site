/*
 * Word counts and time estimates. Pure functions.
 */
import type { WordBucket } from "./analytics/events";

/** Baseline speaking pace for the read-time estimate. */
export const WORDS_PER_MINUTE = 150;

/** Whitespace-separated words. */
export function countWords(text: string): number {
	return text.split(/\s+/).filter(Boolean).length;
}

/** Analytics bucket: 0–50, 51–200, 201–600, 600+ (spec §3). */
export function wordBucket(words: number): WordBucket {
	if (words <= 50) return "0-50";
	if (words <= 200) return "51-200";
	if (words <= 600) return "201-600";
	return "600+";
}

/** Estimated read time in seconds at WORDS_PER_MINUTE. */
export function readTimeSeconds(words: number, wpm: number = WORDS_PER_MINUTE): number {
	return (words / wpm) * 60;
}

/** Seconds to scroll the remaining distance at the current speed. Infinity when speed is 0 or less. */
export function remainingSeconds(remainingPx: number, pxPerSecond: number): number {
	if (pxPerSecond <= 0) return Infinity;
	if (remainingPx <= 0) return 0;
	return remainingPx / pxPerSecond;
}

/** "0:42", "12:05", "1:02:09". Rounds down to whole seconds; Infinity or NaN → "–:––". */
export function formatClock(seconds: number): string {
	if (!Number.isFinite(seconds)) return "–:––";
	const total = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = String(total % 60).padStart(2, "0");
	if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
	return `${minutes}:${secs}`;
}

/** Human read-time for Edit view: "Under a minute", "About 1 min", "About 7 min", "About 1 hr 5 min". */
export function formatReadTime(seconds: number): string {
	// Written as !(>= 60) so NaN also reads as "Under a minute".
	if (!(seconds >= 60)) return "Under a minute";
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `About ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0 ? `About ${hours} hr` : `About ${hours} hr ${rest} min`;
}
