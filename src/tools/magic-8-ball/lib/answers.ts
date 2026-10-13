export type Deck = "classic" | "writers";
export type Tone = "yes" | "maybe" | "no" | "hazy";

export interface Answer {
	text: string;
	tone: Tone;
}

function answersWithTone(tone: Tone, texts: readonly string[]): Answer[] {
	return texts.map((text) => ({ text, tone }));
}

const CLASSIC_ANSWERS: readonly Answer[] = [
	...answersWithTone("yes", [
		"It is certain.",
		"It is decidedly so.",
		"Without a doubt.",
		"Yes definitely.",
		"You may rely on it.",
		"As I see it, yes.",
		"Most likely.",
		"Outlook good.",
		"Yes.",
		"Signs point to yes.",
	]),
	...answersWithTone("maybe", [
		"Reply hazy, try again.",
		"Ask again later.",
		"Better not tell you now.",
		"Cannot predict now.",
		"Concentrate and ask again.",
	]),
	...answersWithTone("no", [
		"Don't count on it.",
		"My reply is no.",
		"My sources say no.",
		"Outlook not so good.",
		"Very doubtful.",
	]),
];

const WRITERS_ANSWERS: readonly Answer[] = [
	...answersWithTone("yes", [
		"Stamped. Approved.",
		"Write it down.",
		"Yes. Start today.",
		"The Department concurs.",
		"Signs point to page one.",
		"Trust the first instinct.",
		"Yes, in the second draft.",
		"Filed under yes.",
		"Send it.",
		"It is decidedly so.",
	]),
	...answersWithTone("maybe", [
		"Sleep on it.",
		"Read it aloud first.",
		"Resubmit in triplicate.",
		"The committee is still reading.",
		"Ask again after a walk.",
	]),
	...answersWithTone("no", [
		"Kill that darling.",
		"Cut it.",
		"Not in this draft.",
		"Revise and resubmit.",
		"Strike that.",
	]),
];

export const DECKS: Record<Deck, readonly Answer[]> = {
	classic: CLASSIC_ANSWERS,
	writers: WRITERS_ANSWERS,
};

export const DECK_NAMES: Record<Deck, string> = {
	classic: "Classic",
	writers: "Writer's deck",
};

export const TOO_SOON_ANSWERS: readonly Answer[] = answersWithTone("hazy", [
	"Ask again later.",
	"Patience. The Department is processing.",
	"Too much shaking. Let it settle.",
	"Reply hazy, try again.",
]);

export function pickAnswer(
	answers: readonly Answer[],
	previous: Answer | null,
	random: () => number = Math.random,
): Answer {
	const candidates = answers.filter((answer) => answer.text !== previous?.text);
	const pool = candidates.length > 0 ? candidates : answers;
	const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
	return pool[index];
}
