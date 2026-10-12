import type { Unit } from "../../../lib/text/measure";
import { formatAmount } from "./readout";

export type Rule = "at-most" | "at-least" | "exactly" | "around";

export const RULES: readonly Rule[] = ["at-most", "at-least", "exactly", "around"];
export const UNITS: readonly Unit[] = ["words", "characters", "seconds"];

/** `min` turns a target into a range: below it is under, whatever the rule. */
export interface Target {
	unit: Unit;
	value: number;
	rule: Rule;
	min?: number;
}

export type TargetState = "under" | "met" | "over";

export interface Evaluation {
	state: TargetState;
	status: string;
}

export const AROUND_TOLERANCE = 0.1;

export function isUsable(target: Target): boolean {
	return target.value > 0 && Number.isFinite(target.value);
}

export function evaluateTarget(measured: number, target: Target): Evaluation {
	const amount = target.unit === "seconds" ? Math.round(measured) : measured;
	const { value, unit, rule, min } = target;
	const under = (goal: number): Evaluation => ({
		state: "under",
		status: `${formatAmount(goal - amount, unit)} to go`,
	});
	const over = (): Evaluation => ({ state: "over", status: `${formatAmount(amount - value, unit)} over` });
	const met = (status: string): Evaluation => ({ state: "met", status });

	if (min !== undefined && amount < min) return under(min);
	switch (rule) {
		case "at-most":
			if (amount > value) return over();
			return met(amount === value ? "At the limit" : `${formatAmount(value - amount, unit)} left`);
		case "at-least":
			return amount >= value ? met("Target reached") : under(value);
		case "exactly":
			if (amount === value) return met("On target");
			return amount > value ? over() : under(value);
		case "around": {
			if (amount === value) return met("On target");
			const off = Math.abs(amount - value) / value;
			if (off <= AROUND_TOLERANCE) return met(`Within ${Math.ceil(off * 100)}%`);
			return amount > value ? over() : under(value);
		}
	}
}
