import { measure } from "../../../lib/text/measure";
import type { Store as BaseStore } from "../../../lib/store";
import { countText } from "./readout";
import { evaluateTarget, isUsable, type Evaluation, type Target } from "./target";

export interface State {
	text: string;
	showTarget: boolean;
	target: Target;
	presetId: string;
	rhythmOpen: boolean;
}

export type Store = BaseStore<State>;

export const DEFAULT_TARGET: Target = { unit: "words", value: 240, rule: "at-most" };

export const INITIAL_STATE: State = {
	text: "",
	showTarget: false,
	target: DEFAULT_TARGET,
	presetId: "custom",
	rhythmOpen: false,
};

/** The target the text is measured against, or null when it's switched off or has no usable value. */
export function activeTarget(state: State): Target | null {
	return state.showTarget && isUsable(state.target) ? state.target : null;
}

export interface Summary {
	count: string;
	evaluation: Evaluation | null;
}

export function summarize(state: State): Summary {
	const { unit } = state.target;
	const amount = measure(state.text, unit);
	const target = activeTarget(state);
	if (!target) return { count: countText(amount, unit), evaluation: null };
	return { count: countText(amount, unit, target.value), evaluation: evaluateTarget(amount, target) };
}
