import { isRecord } from "../../teleprompter/lib/object";
import type { Unit } from "../../../lib/text/measure";
import { DEFAULT_TARGET, type State } from "./state";
import { RULES, UNITS, type Rule, type Target } from "./target";

export const CUSTOM_PRESET = "custom";

export type Settings = Pick<State, "showTarget" | "target" | "presetId" | "rhythmOpen">;

export const DEFAULT_SETTINGS: Readonly<Settings> = {
	showTarget: false,
	target: DEFAULT_TARGET,
	presetId: CUSTOM_PRESET,
	rhythmOpen: false,
};

export const pickSettings = ({ showTarget, target, presetId, rhythmOpen }: State): Settings => ({
	showTarget,
	target,
	presetId,
	rhythmOpen,
});

export function validateSettings(input: unknown): Settings {
	const raw = isRecord(input) ? input : {};
	return {
		showTarget: pickBool(raw.showTarget, DEFAULT_SETTINGS.showTarget),
		target: validateTarget(raw.target),
		presetId: typeof raw.presetId === "string" && raw.presetId !== "" ? raw.presetId : DEFAULT_SETTINGS.presetId,
		rhythmOpen: pickBool(raw.rhythmOpen, DEFAULT_SETTINGS.rhythmOpen),
	};
}

function validateTarget(input: unknown): Target {
	const raw = isRecord(input) ? input : {};
	const target: Target = {
		unit: pickEnum<Unit>(UNITS, raw.unit, DEFAULT_TARGET.unit),
		rule: pickEnum<Rule>(RULES, raw.rule, DEFAULT_TARGET.rule),
		value: pickAmount(raw.value) ?? DEFAULT_TARGET.value,
	};
	const min = pickAmount(raw.min);
	return min === undefined || min >= target.value ? target : { ...target, min };
}

function pickEnum<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
	return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function pickBool(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function pickAmount(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}
