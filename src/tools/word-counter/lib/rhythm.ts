import type { Sentence } from "../../../lib/text/sentences";

export const LONG_SENTENCE_WORDS = 30;

const PREVIEW_WORDS = 6;

export interface RhythmSummary {
	sentences: number;
	averageWords: number;
	longestWords: number;
}

export function summarizeRhythm(sentences: readonly Sentence[]): RhythmSummary {
	const totalWords = sentences.reduce((total, { words }) => total + words, 0);
	return {
		sentences: sentences.length,
		averageWords: sentences.length === 0 ? 0 : Math.round(totalWords / sentences.length),
		longestWords: sentences.reduce((longest, { words }) => Math.max(longest, words), 0),
	};
}

export function rhythmSummaryText({ sentences, averageWords, longestWords }: RhythmSummary): string {
	if (sentences === 0) return "No sentences yet";
	return [
		plural(sentences, "sentence"),
		`average ${plural(averageWords, "word")}`,
		`longest ${plural(longestWords, "word")}`,
	].join(" · ");
}

export function isLongSentence({ words }: Sentence): boolean {
	return words > LONG_SENTENCE_WORDS;
}

export function sentenceDescription(text: string, sentences: readonly Sentence[], index: number): string {
	const sentence = sentences[index];
	const long = isLongSentence(sentence) ? " · long sentence" : "";
	const position = `Sentence ${index + 1} of ${sentences.length}`;
	return `${position} · ${plural(sentence.words, "word")}${long} · ${preview(text, sentence)}`;
}

function preview(text: string, { start, end }: Sentence): string {
	const words = text.slice(start, end).split(/\s+/);
	const opening = words.slice(0, PREVIEW_WORDS).join(" ");
	return `“${opening}${words.length > PREVIEW_WORDS ? "…" : ""}”`;
}

function plural(amount: number, noun: string): string {
	return `${amount} ${noun}${amount === 1 ? "" : "s"}`;
}

export interface StripGeometry {
	/** Drawing units across and down; one bar is one unit wide. */
	width: number;
	height: number;
	bars: string;
	longBars: string;
	longMarks: string;
	/** Where a sentence of exactly the threshold's length reaches, or null when no sentence gets that long. */
	thresholdY: number | null;
}

export const MARK_BAND = 8;
const BAR_AREA = 72;
const BAR_WIDTH = 0.8;

/** SVG path data for the strip, as three paths, so thousands of sentences cost three elements. */
export function stripGeometry(sentences: readonly Sentence[]): StripGeometry {
	const { longestWords } = summarizeRhythm(sentences);
	const wordsAtFullHeight = Math.max(longestWords, LONG_SENTENCE_WORDS);
	const height = MARK_BAND + BAR_AREA;
	const bars: string[] = [];
	const longBars: string[] = [];
	const longMarks: string[] = [];
	sentences.forEach((sentence, index) => {
		const barHeight = Math.max(1, (sentence.words / wordsAtFullHeight) * BAR_AREA);
		const bar = `M${index} ${height - barHeight}h${BAR_WIDTH}v${barHeight}h-${BAR_WIDTH}z`;
		if (!isLongSentence(sentence)) return void bars.push(bar);
		longBars.push(bar);
		longMarks.push(`M${index} 0h${BAR_WIDTH}v${MARK_BAND - 2}h-${BAR_WIDTH}z`);
	});
	return {
		width: Math.max(1, sentences.length),
		height,
		bars: bars.join(""),
		longBars: longBars.join(""),
		longMarks: longMarks.join(""),
		thresholdY:
			longestWords > LONG_SENTENCE_WORDS ? height - (LONG_SENTENCE_WORDS / wordsAtFullHeight) * BAR_AREA : null,
	};
}

/** The bar under a pointer, given how far across the strip it is (0 to 1). */
export function barAt(fraction: number, barCount: number): number {
	return Math.min(barCount - 1, Math.max(0, Math.floor(fraction * barCount)));
}
