import { required } from "../../lib/dom";
import type { Unit } from "../../lib/text/measure";
import type { State, Store } from "./lib/state";
import { customTarget, findPreset, NO_PRESET, pickerValue } from "./lib/presets";
import { CUSTOM_PRESET } from "./lib/settings";
import type { Rule, Target } from "./lib/target";

export function mountTargetPanel(store: Store): void {
	const showTarget = required<HTMLInputElement>(document, "#wc-show-target");
	const preset = required<HTMLSelectElement>(document, "#wc-preset");
	const presetDescription = required<HTMLElement>(document, "#wc-preset-description");
	const rule = required<HTMLSelectElement>(document, "#wc-rule");
	const value = required<HTMLInputElement>(document, "#wc-target");
	const unit = required<HTMLSelectElement>(document, "#wc-unit");

	const setTarget = (patch: Partial<Target>) =>
		store.set({ target: customTarget(store.get().target, patch), presetId: CUSTOM_PRESET });

	function choosePreset(id: string) {
		const chosen = findPreset(id);
		if (chosen) return store.set({ presetId: id, target: chosen.target, showTarget: true });
		if (id === NO_PRESET) return store.set({ presetId: id, showTarget: false });
		store.set({ presetId: CUSTOM_PRESET, showTarget: true });
	}

	preset.addEventListener("change", () => choosePreset(preset.value));
	showTarget.addEventListener("change", () => {
		const hadNoPreset = store.get().presetId === NO_PRESET;
		store.set({
			showTarget: showTarget.checked,
			...(showTarget.checked && hadNoPreset && { presetId: CUSTOM_PRESET }),
		});
	});
	rule.addEventListener("change", () => setTarget({ rule: rule.value as Rule }));
	unit.addEventListener("change", () => setTarget({ unit: unit.value as Unit }));
	// An empty or partly typed number reads as NaN; 0 stands for "no target" without putting NaN in the store.
	value.addEventListener("input", () =>
		setTarget({ value: Number.isFinite(value.valueAsNumber) ? value.valueAsNumber : 0 }),
	);

	function render({ showTarget: shown, target, presetId }: Readonly<State>) {
		showTarget.checked = shown;
		preset.value = pickerValue(presetId);
		presetDescription.textContent = findPreset(presetId)?.description ?? "";
		rule.value = target.rule;
		unit.value = target.unit;
		const typed = Number.isFinite(value.valueAsNumber) ? value.valueAsNumber : 0;
		if (typed !== target.value) value.value = target.value > 0 ? String(target.value) : "";
	}

	render(store.get());
	store.subscribe(render);
}
