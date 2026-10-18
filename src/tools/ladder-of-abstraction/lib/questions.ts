import type { Rung } from "./ladder";

const QUESTIONS: Record<Rung["reachedBy"], readonly string[]> = {
	start: ["Write one line from your piece. A detail or an idea, either works."],
	up: [
		"So what? What does the line below add up to?",
		"Why does the line below matter?",
		"What is the line below an example of?",
	],
	down: [
		"Like what? Name something a reader could see, hear, or touch.",
		"Give one moment, place, or object that shows the line above.",
		"Where would a reader notice this? Show one instance.",
	],
};

function stableIndex(id: string, length: number): number {
	let sum = 0;
	for (const char of id) sum += char.charCodeAt(0);
	return sum % length;
}

/** The question an empty rung asks. It stays the same for a rung across renders and visits. */
export function questionFor(rung: Rung): string {
	const questions = QUESTIONS[rung.reachedBy];
	return questions[stableIndex(rung.id, questions.length)];
}
