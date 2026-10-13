import type { FaqItem } from "../../lib/seo/faq";

export const faq: FaqItem[] = [
	{
		question: "What does Draft Analysis show?",
		answer:
			"It splits your draft into sentences and draws one bar per sentence, as tall as the sentence is long. You see the rhythm of your writing at a glance, with the average and longest sentence in words.",
	},
	{
		question: "What counts as a long sentence?",
		answer:
			"Any sentence of more than 30 words. Long sentences rise past a dashed line and carry a mark above their bar. A long sentence is not always a mistake, but it is worth a second look.",
	},
	{
		question: "How does it find where a sentence ends?",
		answer:
			"It uses your browser's sentence rules, with a few corrections. Abbreviations such as Mr., Dr. and e.g., and initials like J. R. R., do not end a sentence.",
	},
	{
		question: "Why vary sentence length?",
		answer:
			"A run of sentences of the same length reads as monotone. Mixing short and long sentences gives writing a pace, with short ones for emphasis and long ones to carry a thought.",
	},
	{
		question: "Is my draft saved or uploaded?",
		answer:
			"Your draft is saved in your browser only, so it is still there when you come back, and it is never sent to our servers. Clear your browser's site data to remove it.",
	},
];
