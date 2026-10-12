import { countWords, segmenter, type Span } from "./measure";

export interface Sentence extends Span {
	words: number;
}

const sentenceSegmenter = segmenter("sentence");

// Abbreviations that are followed by a capitalised name far more often than they end a sentence.
const TITLE_ABBREVIATIONS = new Set([
	"mr.",
	"mrs.",
	"ms.",
	"mx.",
	"dr.",
	"prof.",
	"rev.",
	"hon.",
	"st.",
	"fr.",
	"gen.",
	"col.",
	"capt.",
	"lt.",
	"sgt.",
	"gov.",
	"sen.",
	"rep.",
	"e.g.",
	"i.e.",
	"vs.",
	"cf.",
	"approx.",
]);
const INITIAL = /^\p{Lu}\.$/u;
const OPENING_PUNCTUATION = /^[\s"'“‘«(\[]+/u;
const STARTS_LOWERCASE = /^[\s"'“‘«(\[]*\p{Ll}/u;
const ENDS_LINE = /\n\s*$/;

export function sentences(text: string): Sentence[] {
	const merged: Span[] = [];
	for (const piece of roughSentences(text)) {
		const previous = merged.at(-1);
		if (previous && continuesSentence(text.slice(previous.start, previous.end), text.slice(piece.start, piece.end))) {
			previous.end = piece.end;
		} else {
			merged.push(piece);
		}
	}
	return merged.map((span) => trimmed(text, span)).filter((sentence) => sentence.words > 0);
}

function roughSentences(text: string): Span[] {
	if (!sentenceSegmenter) return lines(text);
	// The segmenter ends a sentence at "..." but not at "…"; a same-length stand-in makes them agree and keeps offsets.
	const ellipsesAsPeriods = text.replaceAll("…", ".");
	return Array.from(sentenceSegmenter.segment(ellipsesAsPeriods), ({ segment, index }) => ({
		start: index,
		end: index + segment.length,
	}));
}

function lines(text: string): Span[] {
	const spans: Span[] = [];
	let start = 0;
	for (const lineBreak of text.matchAll(/\n/g)) {
		spans.push({ start, end: lineBreak.index + 1 });
		start = lineBreak.index + 1;
	}
	spans.push({ start, end: text.length });
	return spans;
}

function continuesSentence(previous: string, next: string): boolean {
	if (ENDS_LINE.test(previous)) return false;
	return STARTS_LOWERCASE.test(next) || endsWithAbbreviation(previous);
}

function endsWithAbbreviation(sentence: string): boolean {
	const lastWord = (sentence.trimEnd().split(/\s+/).at(-1) ?? "").replace(OPENING_PUNCTUATION, "");
	return TITLE_ABBREVIATIONS.has(lastWord.toLowerCase()) || INITIAL.test(lastWord);
}

function trimmed(text: string, { start, end }: Span): Sentence {
	const slice = text.slice(start, end);
	const leading = slice.length - slice.trimStart().length;
	const trailing = slice.length - slice.trimEnd().length;
	const sentence = { start: start + leading, end: Math.max(start + leading, end - trailing) };
	return { ...sentence, words: countWords(text.slice(sentence.start, sentence.end)) };
}
