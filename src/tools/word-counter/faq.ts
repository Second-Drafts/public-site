import type { FaqItem } from "../../lib/seo/faq";

export const faq: FaqItem[] = [
	{
		question: "Do hyphenated words count as one word?",
		answer:
			'Yes. Single hyphens join words, so "well-known" counts as one. Em dashes, en dashes, double hyphens (--) and ellipses separate words, so the two halves of "night—or morning" count separately.',
	},
	{
		question: "Are spaces counted as characters?",
		answer:
			"Yes. The character count includes spaces, punctuation, and line breaks. It counts what you see as one character, so an emoji or an accented letter is one, not two.",
	},
	{
		question: "How long is 500 words when read aloud?",
		answer:
			'About 3 minutes 20 seconds. Speaking time assumes 150 words per minute, a comfortable pace for a talk or a voiceover. Choose "minutes aloud" as the unit to aim for a time instead of a number of words.',
	},
	{
		question: "Is my text saved or uploaded?",
		answer:
			"Your text is saved in your browser only, so it is still there when you come back. It's never sent anywhere else.",
	},
	{
		question: "How do I check a limit for an essay, post or contest?",
		answer:
			"Pick a format such as Common App personal essay, drabble or X post, or set your own limit: at most, at least, exactly, around or between, in words, characters or minutes aloud. The count shows how far you are from it, and when you are over, the words past the limit are marked in red so you can see what to cut.",
	},
];
