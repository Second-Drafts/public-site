import { formatSpeakingTime, measure, speakingSeconds, type Unit } from "../../../lib/text/measure";
import type { Store as BaseStore } from "../../../lib/store";
import { countText } from "../../../lib/text/readout";
import { DEFAULT_SETTINGS } from "./settings";
import { evaluateTarget, isUsable, type Evaluation, type Target } from "./target";

export interface State {
	text: string;
	showTarget: boolean;
	target: Target;
	presetId: string;
}

export type Store = BaseStore<State>;

export const INITIAL_STATE: State = { text: "", ...DEFAULT_SETTINGS };

/** The target the text is measured against, or null when it's switched off or has no usable value. */
export function activeTarget(state: State): Target | null {
	return state.showTarget && isUsable(state.target) ? state.target : null;
}

export interface Summary {
	count: string;
	evaluation: Evaluation | null;
}

let measuredText: string | undefined;
let measuredAmounts: Partial<Record<Unit, number>> = {};

/** Every line under the editor measures the same draft on each keystroke, so each unit is counted once per text. */
export function measureDraft(text: string, unit: Unit): number {
	if (text !== measuredText) {
		measuredText = text;
		measuredAmounts = {};
	}
	return (measuredAmounts[unit] ??= measure(text, unit));
}

export function summarize(state: State): Summary {
	const { unit } = state.target;
	const amount = measureDraft(state.text, unit);
	const target = activeTarget(state);
	if (!target) return { count: countText(amount, unit), evaluation: null };
	return { count: countText(amount, unit, target.value), evaluation: evaluateTarget(amount, target) };
}

/** How long the text takes to say, or null when there's nothing to say or the count already reads in spoken time. */
export function speakingTime({ text, target }: State): string | null {
	if (text.trim() === "" || target.unit === "seconds") return null;
	return `${formatSpeakingTime(speakingSeconds(measureDraft(text, "words")))} aloud`;
}
