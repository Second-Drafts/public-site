import { describe, expect, it } from "vitest";
import { DECKS, TOO_SOON_ANSWERS } from "./answers";
import { answerChosen, answerSettled, shakeStarted } from "./oracle";
import { INITIAL_STATE, type State } from "./state";

const apply = (state: State, patch: Partial<State>): State => ({ ...state, ...patch });
const first = () => 0;

describe("shakeStarted", () => {
	it("notes whether a question was asked, ignoring blank space", () => {
		expect(shakeStarted({ ...INITIAL_STATE, question: "  " }, "click").shake?.asked).toBe(false);
		expect(shakeStarted({ ...INITIAL_STATE, question: "Should I?" }, "click").shake?.asked).toBe(true);
	});

	it("is too soon only while the ball is settling", () => {
		for (const phase of ["idle", "shaking", "revealed"] as const) {
			expect(shakeStarted({ ...INITIAL_STATE, phase }, "drag").shake?.tooSoon).toBe(false);
		}
		expect(shakeStarted({ ...INITIAL_STATE, phase: "settling" }, "drag").shake?.tooSoon).toBe(true);
	});
});

describe("answerChosen", () => {
	it("draws from the chosen deck", () => {
		const shaking = apply({ ...INITIAL_STATE, deck: "writers" }, shakeStarted(INITIAL_STATE, "click"));
		expect(DECKS.writers).toContain(answerChosen(shaking, first).reading?.answer);
	});

	it("draws a hazy answer after a shake that came too soon", () => {
		const settling = { ...INITIAL_STATE, phase: "settling" as const };
		const shaking = apply(settling, shakeStarted(settling, "click"));
		expect(TOO_SOON_ANSWERS).toContain(answerChosen(shaking, first).reading?.answer);
	});

	it("keeps the question with the answer, trimmed", () => {
		const asking = { ...INITIAL_STATE, question: " Is it done? " };
		expect(answerChosen(apply(asking, shakeStarted(asking, "submit")), first).reading?.question).toBe("Is it done?");
	});
});

describe("answerSettled", () => {
	it("reveals the answer and adds it to the top of the log", () => {
		const shaking = apply(INITIAL_STATE, shakeStarted(INITIAL_STATE, "click"));
		const settling = apply(shaking, answerChosen(shaking, first));
		const revealed = apply(settling, answerSettled(settling, settling.reading!.answer));
		expect(revealed.phase).toBe("revealed");
		expect(revealed.log).toEqual([settling.reading]);
	});

	it("ignores an answer that a newer shake replaced", () => {
		const shaking = apply(INITIAL_STATE, shakeStarted(INITIAL_STATE, "click"));
		const settling = apply(shaking, answerChosen(shaking, first));
		const shakenAgain = apply(settling, shakeStarted(settling, "click"));
		expect(answerSettled(shakenAgain, settling.reading!.answer)).toEqual({});
	});
});
