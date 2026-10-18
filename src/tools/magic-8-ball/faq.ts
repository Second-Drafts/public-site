import type { FaqItem } from "../../lib/seo/faq";

export const faq: FaqItem[] = [
	{
		question: "What are the Magic 8 Ball answers?",
		answer:
			'There are 20 classic answers: 10 affirmative, 5 non-committal and 5 negative. They run from "It is certain." to "Reply hazy, try again." to "Very doubtful." The full list is above.',
	},
	{
		question: "Is it random?",
		answer:
			"Yes. Every answer in the deck is equally likely, except that we never give the same answer twice in a row, so asking the same question again gets a fresh answer.",
	},
	{
		question: "How do I shake it on my phone?",
		answer:
			"Press Shake your phone, allow motion access if your phone asks, then shake it as you would a real ball. You can also tap the ball, or drag it back and forth.",
	},
	{
		question: "Why does my iPhone ask for motion access?",
		answer:
			"Safari asks before any page reads motion. Tap Shake your phone and allow it, and the ball can feel your shake. If you would rather not, tap the ball instead.",
	},
	{
		question: "Is my question private?",
		answer:
			"Yes. Your question is never sent to our servers or saved. It stays in the page until you close it. Motion readings are used only to notice a shake and never leave your device.",
	},
	{
		question: "What is the writer's deck?",
		answer:
			'An alternative set of 20 answers, from the Department, for questions about your draft, such as "Kill that darling." and "Resubmit in triplicate." Switch decks beside the question.',
	},
	{
		question: "What happens if I shake it again too soon?",
		answer: "The window clouds over and you get a hazy answer. Let the ball settle and shake again for a real one.",
	},
];
