import { measure } from "../../../lib/text/measure";
import { countText, formatAmount, unitLabel } from "./readout";
import { activeTarget, type State } from "./state";
import { evaluateTarget, type Evaluation } from "./target";

export interface SelectionRange {
	start: number;
	end: number;
}

export interface SelectionSummary {
	selected: string;
	cut: CutResult | null;
}

export interface CutResult {
	landing: string;
	evaluation: Evaluation;
}

/** What the selected text weighs, and where cutting it would leave the draft. Null when nothing is selected. */
export function summarizeSelection(state: State, { start, end }: SelectionRange): SelectionSummary | null {
	const selectedText = state.text.slice(start, end);
	if (selectedText.trim() === "") return null;
	const { unit } = state.target;
	const selectedAmount = measure(selectedText, unit);
	const totalAmount = measure(state.text, unit);
	return {
		selected: selectedLabel(selectedAmount, totalAmount, state),
		cut: cutResult(state, state.text.slice(0, start) + state.text.slice(end)),
	};
}

function selectedLabel(selectedAmount: number, totalAmount: number, { target }: State): string {
	const { unit } = target;
	return `${formatAmount(selectedAmount, unit)} of ${formatAmount(totalAmount, unit)} ${unitLabel(totalAmount, unit)} selected`;
}

function cutResult(state: State, remainingText: string): CutResult | null {
	const target = activeTarget(state);
	if (!target) return null;
	const remaining = measure(remainingText, target.unit);
	return {
		landing: countText(remaining, target.unit, target.value),
		evaluation: evaluateTarget(remaining, target),
	};
}
