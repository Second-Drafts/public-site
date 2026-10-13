import { required } from "../../lib/dom";
import type { Unit } from "../../lib/text/measure";
import { CUSTOM_PRESET, findPreset, NO_PRESET } from "./lib/presets";
import { activeTarget, type State, type Store } from "./lib/state";
import { isUsable, type Target } from "./lib/target";
import { fieldsFromTarget, sameTarget, targetFromFields, type FieldRule, type TargetFields } from "./lib/target-fields";

export function mountTargetPanel(store: Store): void {
	const remove = required<HTMLButtonElement>(document, "#wc-target-remove");
	const range = required(document, "#wc-range");
	const rule = required<HTMLSelectElement>(document, "#wc-rule");
	const min = required<HTMLInputElement>(document, "#wc-min");
	const value = required<HTMLInputElement>(document, "#wc-target");
	const unit = required<HTMLSelectElement>(document, "#wc-unit");
	const description = required(document, "#wc-preset-description");
	const formats = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-preset]"));

	function readFields(): TargetFields {
		return {
			rule: rule.value as FieldRule,
			min: min.valueAsNumber,
			value: value.valueAsNumber,
			unit: unit.value as Unit,
		};
	}

	function writeFields(fields: TargetFields) {
		rule.value = fields.rule;
		unit.value = fields.unit;
		writeNumber(min, fields.min);
		writeNumber(value, fields.value);
	}

	function applyFields() {
		const target = targetFromFields(readFields());
		store.set({ target, showTarget: isUsable(target), presetId: CUSTOM_PRESET });
	}

	remove.addEventListener("click", () => {
		store.set({ showTarget: false, presetId: NO_PRESET });
		value.focus();
	});
	for (const format of formats) {
		format.addEventListener("click", () => {
			const preset = findPreset(format.dataset.preset!)!;
			store.set({ presetId: preset.id, target: preset.target, showTarget: true });
		});
	}
	rule.addEventListener("change", applyFields);
	unit.addEventListener("change", applyFields);
	min.addEventListener("input", applyFields);
	value.addEventListener("input", applyFields);

	function render(state: Readonly<State>) {
		const { target, presetId } = state;
		const active = activeTarget(state) !== null;
		const preset = active ? findPreset(presetId) : undefined;
		remove.hidden = !active;
		for (const format of formats) format.setAttribute("aria-pressed", String(format.dataset.preset === preset?.id));
		description.textContent = preset?.description ?? "";
		description.hidden = !preset;

		// The fields lead while they already describe the target, so a half-filled range or a cleared number isn't overwritten.
		const shown: Target = active ? target : { ...target, value: 0 };
		if (!sameTarget(targetFromFields(readFields()), shown)) writeFields(fieldsFromTarget(shown));
		range.hidden = rule.value !== "between";
	}

	render(store.get());
	store.subscribe(render);
}

function writeNumber(input: HTMLInputElement, amount: number) {
	const typed = Number.isFinite(input.valueAsNumber) ? input.valueAsNumber : 0;
	if (typed !== amount) input.value = amount > 0 ? String(amount) : "";
}
