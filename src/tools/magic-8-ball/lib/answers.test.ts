import { describe, expect, it } from "vitest";
import { DECKS, DECK_NAMES, TOO_SOON_ANSWERS, pickAnswer, type Deck, type Tone } from "./answers";

const deckNames = Object.keys(DECKS) as Deck[];

function countTone(deck: Deck, tone: Tone): number {
	return DECKS[deck].filter((answer) => answer.tone === tone).length;
}

describe.each(deckNames)("the %s deck", (deck) => {
	it("has twenty answers split ten yes, five maybe, five no", () => {
		expect(DECKS[deck]).toHaveLength(20);
		expect(countTone(deck, "yes")).toBe(10);
		expect(countTone(deck, "maybe")).toBe(5);
		expect(countTone(deck, "no")).toBe(5);
	});

	it("has no duplicate answers", () => {
		const texts = DECKS[deck].map((answer) => answer.text);
		expect(new Set(texts).size).toBe(texts.length);
	});

	it("has a display name", () => {
		expect(DECK_NAMES[deck].length).toBeGreaterThan(0);
	});
});

describe("every answer", () => {
	const everyAnswer = [...deckNames.flatMap((deck) => DECKS[deck]), ...TOO_SOON_ANSWERS];

	it("is short enough for the window", () => {
		for (const answer of everyAnswer) {
			expect(answer.text.length).toBeLessThanOrEqual(40);
		}
	});

	it("never shouts", () => {
		for (const answer of everyAnswer) {
			expect(answer.text).not.toContain("!");
		}
	});
});

describe("too-soon answers", () => {
	it("are all hazy", () => {
		expect(TOO_SOON_ANSWERS.length).toBeGreaterThan(1);
		expect(TOO_SOON_ANSWERS.every((answer) => answer.tone === "hazy")).toBe(true);
	});
});

describe("pickAnswer", () => {
	const answers = DECKS.classic;

	it("is deterministic for a given random", () => {
		expect(pickAnswer(answers, null, () => 0.5)).toEqual(pickAnswer(answers, null, () => 0.5));
	});

	it("picks the first and last answers at the extremes", () => {
		expect(pickAnswer(answers, null, () => 0)).toBe(answers[0]);
		expect(pickAnswer(answers, null, () => 0.999999)).toBe(answers[answers.length - 1]);
	});

	it("never repeats the previous answer, wherever the random lands", () => {
		const previous = answers[3];
		for (let step = 0; step < 100; step++) {
			const picked = pickAnswer(answers, previous, () => step / 100);
			expect(picked.text).not.toBe(previous.text);
		}
	});

	it("can reach every other answer", () => {
		const previous = answers[0];
		const reached = new Set<string>();
		for (let step = 0; step < 100; step++) {
			reached.add(pickAnswer(answers, previous, () => step / 100).text);
		}
		expect(reached.size).toBe(answers.length - 1);
	});

	it("matches the previous answer by text", () => {
		const previous = { text: answers[0].text, tone: "no" as const };
		const picked = pickAnswer(answers, previous, () => 0);
		expect(picked.text).toBe(answers[1].text);
	});

	it("still answers when the previous one is the only choice", () => {
		const only = [{ text: "Yes.", tone: "yes" as const }];
		expect(pickAnswer(only, only[0], () => 0.3)).toBe(only[0]);
	});
});
