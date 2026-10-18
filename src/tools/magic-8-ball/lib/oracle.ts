import { DECKS, TOO_SOON_ANSWERS, pickAnswer, type Answer } from "./answers";
import type { ShakeMethod, State } from "./state";

export function shakeStarted(state: Readonly<State>, method: ShakeMethod): Partial<State> {
	return {
		phase: "shaking",
		shake: { method, asked: state.question.trim() !== "", tooSoon: state.phase === "settling" },
	};
}

export function answerChosen(state: Readonly<State>, random: () => number = Math.random): Partial<State> {
	const answers = state.shake?.tooSoon ? TOO_SOON_ANSWERS : DECKS[state.deck];
	const answer = pickAnswer(answers, state.reading?.answer ?? null, random);
	return { phase: "settling", reading: { question: state.question.trim(), answer, deck: state.deck } };
}

export function answerSettled(state: Readonly<State>, settled: Answer): Partial<State> {
	if (state.phase !== "settling" || state.reading?.answer !== settled) return {};
	return { phase: "revealed", log: [state.reading, ...state.log] };
}
