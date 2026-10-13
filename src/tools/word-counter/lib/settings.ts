import type { Unit } from "../../../lib/text/measure";
import { asRecord, pickBool, pickEnum } from "../../../lib/validate";
import { CUSTOM_PRESET } from "./presets";
import type { State } from "./state";
import { DEFAULT_TARGET, RULES, UNITS, type Rule, type Target } from "./target";

export type Settings = Pick<State, "showTarget" | "target" | "presetId">;

export const DEFAULT_SETTINGS: Readonly<Settings> = {
	showTarget: false,
	target: DEFAULT_TARGET,
	presetId: CUSTOM_PRESET,
};

export const pickSettings = ({ showTarget, target, presetId }: State): Settings => ({
	showTarget,
	target,
	presetId,
});

export function validateSettings(input: unknown): Settings {
	const raw = asRecord(input);
	return {
		showTarget: pickBool(raw.showTarget, DEFAULT_SETTINGS.showTarget),
		target: validateTarget(raw.target),
		presetId: typeof raw.presetId === "string" && raw.presetId !== "" ? raw.presetId : DEFAULT_SETTINGS.presetId,
	};
}

function validateTarget(input: unknown): Target {
	const raw = asRecord(input);
	const target: Target = {
		unit: pickEnum<Unit>(UNITS, raw.unit, DEFAULT_TARGET.unit),
		rule: pickEnum<Rule>(RULES, raw.rule, DEFAULT_TARGET.rule),
		value: pickAmount(raw.value) ?? DEFAULT_TARGET.value,
	};
	const min = pickAmount(raw.min);
	return min === undefined || min >= target.value ? target : { ...target, min };
}

function pickAmount(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}
