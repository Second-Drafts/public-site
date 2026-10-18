import type { Store as BaseStore } from "../../../lib/store";
import { asRecord, pickBool, pickEnum } from "../../../lib/validate";
import { MAX_RUNGS, PASSAGE_ORDERS, startingRung, type Ladder, type PassageOrder, type Rung } from "./ladder";

export interface State {
	ladder: Ladder;
	passageOrder: PassageOrder;
}

export type Store = BaseStore<State>;

export const FIRST_RUNG_ID = "rung-1";

export const INITIAL_STATE: State = {
	ladder: [startingRung(FIRST_RUNG_ID)],
	passageOrder: "detail-first",
};

const REACHED_BY: readonly Rung["reachedBy"][] = ["start", "up", "down"];

function validateRung(input: unknown): Rung | null {
	const raw = asRecord(input);
	if (typeof raw.id !== "string" || raw.id === "" || typeof raw.text !== "string") return null;
	return {
		id: raw.id,
		text: raw.text,
		reachedBy: pickEnum(REACHED_BY, raw.reachedBy, "start"),
		leftOutOfPassage: pickBool(raw.leftOutOfPassage, false),
	};
}

function validateLadder(input: unknown): Ladder {
	if (!Array.isArray(input)) return INITIAL_STATE.ladder;
	const rungs = new Map<string, Rung>();
	for (const rung of input.map(validateRung)) {
		if (rung && !rungs.has(rung.id) && rungs.size < MAX_RUNGS) rungs.set(rung.id, rung);
	}
	return rungs.size > 0 ? [...rungs.values()] : INITIAL_STATE.ladder;
}

export function validateState(input: unknown): State {
	const raw = asRecord(input);
	return {
		ladder: validateLadder(raw.ladder),
		passageOrder: pickEnum(PASSAGE_ORDERS, raw.passageOrder, INITIAL_STATE.passageOrder),
	};
}
