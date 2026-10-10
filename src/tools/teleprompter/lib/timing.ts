import type { WordBucket } from "./analytics/events";

export const WORDS_PER_MINUTE = 150;

export function countWords(text: string): number {
	return text.split(/\s+/).filter(Boolean).length;
}

export function wordBucket(words: number): WordBucket {
	if (words <= 50) return "0-50";
	if (words <= 200) return "51-200";
	if (words <= 600) return "201-600";
	return "600+";
}

export function readTimeSeconds(words: number, wpm: number = WORDS_PER_MINUTE): number {
	return (words / wpm) * 60;
}

export function remainingSeconds(remainingPx: number, pxPerSecond: number): number {
	if (pxPerSecond <= 0) return Infinity;
	if (remainingPx <= 0) return 0;
	return remainingPx / pxPerSecond;
}

export function formatClock(seconds: number): string {
	if (!Number.isFinite(seconds)) return "–:––";
	const total = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = String(total % 60).padStart(2, "0");
	if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
	return `${minutes}:${secs}`;
}

export function formatReadTime(seconds: number): string {
	// Written as !(>= 60) so NaN also reads as "Under a minute".
	if (!(seconds >= 60)) return "Under a minute";
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `About ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0 ? `About ${hours} hr` : `About ${hours} hr ${rest} min`;
}
