import { required } from "../../lib/dom";
import type { Unit } from "../../lib/text/measure";
import { findPreset, NO_PRESET } from "./lib/presets";
import { CUSTOM_PRESET } from "./lib/settings";
import type { State, Store } from "./lib/state";
import { isUsable, type Target } from "./lib/target";
import { fieldsFromTarget, sameTarget, targetFromFields, type FieldRule, type TargetFields } from "./lib/target-fields";

export function mountTargetPanel(store: Store): void {
	const toggle = required<HTMLButtonElement>(document, "#wc-target-toggle");
	const remove = required<HTMLButtonElement>(document, "#wc-target-remove");
	const drawer = required(document, "#wc-target-drawer");
	const range = required(drawer, "#wc-range");
	const rule = required<HTMLSelectElement>(drawer, "#wc-rule");
	const min = required<HTMLInputElement>(drawer, "#wc-min");
	const value = required<HTMLInputElement>(drawer, "#wc-target");
	const unit = required<HTMLSelectElement>(drawer, "#wc-unit");
	const description = required(drawer, "#wc-preset-description");
	const formats = Array.from(drawer.querySelectorAll<HTMLButtonElement>("[data-preset]"));

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

	function setOpen(open: boolean) {
		drawer.hidden = !open;
		toggle.setAttribute("aria-expanded", String(open));
		if (open) value.focus();
	}

	toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
	remove.addEventListener("click", () => {
		store.set({ showTarget: false, presetId: NO_PRESET });
		setOpen(false);
		toggle.focus();
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

	function render({ showTarget, target, presetId }: Readonly<State>) {
		const active = showTarget && isUsable(target);
		const preset = active ? findPreset(presetId) : undefined;
		toggle.textContent = active ? (preset?.name ?? "Edit target") : "Set a target";
		remove.hidden = !active;
		for (const format of formats) format.setAttribute("aria-pressed", String(format.dataset.preset === preset?.id));
		description.textContent = preset?.description ?? "";

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
