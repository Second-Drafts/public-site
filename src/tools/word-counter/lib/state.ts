import { countWords, formatSpeakingTime, measure, speakingSeconds } from "../../../lib/text/measure";
import type { Store as BaseStore } from "../../../lib/store";
import { countText } from "./readout";
import { evaluateTarget, isUsable, type Evaluation, type Target } from "./target";

export interface State {
	text: string;
	showTarget: boolean;
	target: Target;
	presetId: string;
}

export type Store = BaseStore<State>;

export const DEFAULT_TARGET: Target = { unit: "words", value: 240, rule: "at-most" };

export const INITIAL_STATE: State = {
	text: "",
	showTarget: false,
	target: DEFAULT_TARGET,
	presetId: "custom",
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

/** How long the text takes to say, or null when there's nothing to say or the count already reads in spoken time. */
export function speakingTime({ text, target }: State): string | null {
	if (text.trim() === "" || target.unit === "seconds") return null;
	return `${formatSpeakingTime(speakingSeconds(countWords(text)))} aloud`;
}
