import type { WordBucket } from "../analytics/events";

export type Unit = "words" | "characters" | "seconds";

export interface Span {
	start: number;
	end: number;
}

export const WORDS_PER_MINUTE = 150;

// Whitespace, dashes used as punctuation (em, en, "--") and ellipses separate words; a single hyphen joins them.
const WORD_SEPARATOR = /[\s–—―…]+|-{2,}|\.{3,}/gu;
const HAS_LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const WRITTEN_WITHOUT_SPACES =
	/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
const WHITESPACE = /^\s+$/u;

export function segmenter(granularity: "grapheme" | "word" | "sentence"): Intl.Segmenter | undefined {
	return typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity }) : undefined;
}

const graphemeSegmenter = segmenter("grapheme");
const wordSegmenter = segmenter("word");

export function wordSpans(text: string): Span[] {
	const spans: Span[] = [];
	let tokenStart = 0;
	for (const separator of text.matchAll(WORD_SEPARATOR)) {
		addTokenWords(text, tokenStart, separator.index, spans);
		tokenStart = separator.index + separator[0].length;
	}
	addTokenWords(text, tokenStart, text.length, spans);
	return spans;
}

function addTokenWords(text: string, start: number, end: number, spans: Span[]): void {
	const token = text.slice(start, end);
	if (!HAS_LETTER_OR_NUMBER.test(token)) return;
	if (!wordSegmenter || !WRITTEN_WITHOUT_SPACES.test(token)) {
		spans.push({ start, end });
		return;
	}
	for (const { segment, index, isWordLike } of wordSegmenter.segment(token)) {
		if (isWordLike) spans.push({ start: start + index, end: start + index + segment.length });
	}
}

export function countWords(text: string): number {
	return wordSpans(text).length;
}

function* graphemes(text: string): Generator<{ segment: string; index: number }> {
	if (graphemeSegmenter) {
		yield* graphemeSegmenter.segment(text);
		return;
	}
	let index = 0;
	for (const segment of text) {
		yield { segment, index };
		index += segment.length;
	}
}

export function countCharacters(text: string): number {
	let count = 0;
	for (const _ of graphemes(text)) count++;
	return count;
}

export function countCharactersWithoutSpaces(text: string): number {
	let count = 0;
	for (const { segment } of graphemes(text)) if (!WHITESPACE.test(segment)) count++;
	return count;
}

export function speakingSeconds(words: number, wpm: number = WORDS_PER_MINUTE): number {
	return (words / wpm) * 60;
}

export function measure(text: string, unit: Unit): number {
	if (unit === "characters") return countCharacters(text);
	const words = countWords(text);
	return unit === "seconds" ? speakingSeconds(words) : words;
}

/** The offset of the first word or character past `limit`, or null when the text fits. The text before it measures exactly `limit`. */
export function limitOffset(text: string, unit: Unit, limit: number): number | null {
	if (unit === "characters") return characterLimitOffset(text, wholeLimit(limit));
	const wordLimit = unit === "seconds" ? wordsSpokenIn(limit) : wholeLimit(limit);
	return wordSpans(text)[wordLimit]?.start ?? null;
}

function wholeLimit(limit: number): number {
	return Math.max(0, Math.floor(limit));
}

function wordsSpokenIn(seconds: number, wpm: number = WORDS_PER_MINUTE): number {
	return wholeLimit((seconds * wpm) / 60);
}

function characterLimitOffset(text: string, limit: number): number | null {
	let count = 0;
	for (const { index } of graphemes(text)) {
		if (count === limit) return index;
		count++;
	}
	return null;
}

export function formatSpeakingTime(seconds: number): string {
	const toNearestFive = Math.round(seconds / 5) * 5;
	// Written as !(>= 60) so NaN reads in seconds too.
	if (!(toNearestFive >= 60)) return `About ${toNearestFive >= 5 ? toNearestFive : 5} sec`;
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `About ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return rest === 0 ? `About ${hours} hr` : `About ${hours} hr ${rest} min`;
}

export function wordBucket(words: number): WordBucket {
	if (words <= 50) return "0-50";
	if (words <= 200) return "51-200";
	if (words <= 600) return "201-600";
	if (words <= 2000) return "601-2000";
	if (words <= 10000) return "2001-10000";
	return "10000+";
}
