export type Certainty = "contradiction" | "possible";

export interface Passage {
	chapter: string;
	quote: string;
	marked: string;
}

export interface ExampleFlag {
	certainty: Certainty;
	summary: string;
	passages: [Passage, Passage];
	reason: string;
}

export const EXAMPLE_FLAGS: ExampleFlag[] = [
	{
		certainty: "contradiction",
		summary: "The door in the hill is green in chapter 3 and red in chapter 12.",
		passages: [
			{ chapter: "Chapter 3", quote: "the green door stood half-hidden in the bracken", marked: "green door" },
			{ chapter: "Chapter 12", quote: "painted a red that nobody remembered", marked: "red" },
		],
		reason: "Nothing between the two scenes repaints the door or explains the change.",
	},
	{
		certainty: "contradiction",
		summary: "Mara carries an iron knife through the door, though no iron can cross its threshold.",
		passages: [
			{
				chapter: "Chapter 2",
				quote: "No iron passes the hill door. Old Teg said it as if it were weather.",
				marked: "No iron passes",
			},
			{
				chapter: "Chapter 14",
				quote: "her father’s iron knife still at her belt, Mara stepped through",
				marked: "iron knife",
			},
		],
		reason: "The story sets this rule early and keeps it everywhere else.",
	},
	{
		certainty: "possible",
		summary: "The same evening is both the third day of the thaw and a week since the snow broke.",
		passages: [
			{ chapter: "Chapter 12", quote: "Mara found the door on the third day of the thaw", marked: "third day" },
			{
				chapter: "Chapter 12",
				quote: "a week since the snow broke, and still no word from the pass",
				marked: "a week",
			},
		],
		reason: "Unless the snow broke well before the thaw began, one of these counts is off.",
	},
];

export const CERTAINTY_LABELS: Record<Certainty, string> = {
	contradiction: "Contradiction",
	possible: "Possible",
};

export function splitAroundMark(passage: Passage): { before: string; marked: string; after: string } {
	const start = passage.quote.indexOf(passage.marked);
	if (start === -1) return { before: passage.quote, marked: "", after: "" };
	return {
		before: passage.quote.slice(0, start),
		marked: passage.marked,
		after: passage.quote.slice(start + passage.marked.length),
	};
}
