import type { Unit } from "../../../lib/text/measure";
import type { Rule, Target } from "./target";

/** The sentence's rule choices. "between" is a target with a `min`; its maximum reads as at most. */
export type FieldRule = Rule | "between";

const SECONDS_PER_MINUTE = 60;

/** What the sentence's fields hold. Spoken targets are typed in minutes. An empty or invalid number reads as 0, which means no target. */
export interface TargetFields {
	rule: FieldRule;
	min: number;
	value: number;
	unit: Unit;
}

export function targetFromFields({ rule, min, value, unit }: TargetFields): Target {
	const max = toTargetAmount(positive(value), unit);
	if (rule !== "between") return { unit, rule, value: max };
	const lower = toTargetAmount(positive(min), unit);
	return lower > 0 && lower < max
		? { unit, rule: "at-most", value: max, min: lower }
		: { unit, rule: "at-most", value: max };
}

export function fieldsFromTarget({ unit, rule, value, min }: Target): TargetFields {
	return {
		unit,
		value: toFieldAmount(value, unit),
		rule: min === undefined ? rule : "between",
		min: toFieldAmount(min ?? 0, unit),
	};
}

export function sameTarget(a: Target, b: Target): boolean {
	return a.unit === b.unit && a.rule === b.rule && a.value === b.value && a.min === b.min;
}

function toTargetAmount(amount: number, unit: Unit): number {
	return unit === "seconds" ? Math.round(amount * SECONDS_PER_MINUTE) : amount;
}

function toFieldAmount(amount: number, unit: Unit): number {
	return unit === "seconds" ? Math.round((amount / SECONDS_PER_MINUTE) * 100) / 100 : amount;
}

function positive(amount: number): number {
	return Number.isFinite(amount) && amount > 0 ? amount : 0;
}
