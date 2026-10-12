import { required } from "../../lib/dom";
import type { Unit } from "../../lib/text/measure";
import type { State, Store } from "./lib/state";
import type { Rule, Target } from "./lib/target";

export function mountTargetPanel(store: Store): void {
	const showTarget = required<HTMLInputElement>(document, "#wc-show-target");
	const rule = required<HTMLSelectElement>(document, "#wc-rule");
	const value = required<HTMLInputElement>(document, "#wc-target");
	const unit = required<HTMLSelectElement>(document, "#wc-unit");

	const setTarget = (patch: Partial<Target>) => store.set({ target: { ...store.get().target, ...patch } });

	showTarget.addEventListener("change", () => store.set({ showTarget: showTarget.checked }));
	rule.addEventListener("change", () => setTarget({ rule: rule.value as Rule }));
	unit.addEventListener("change", () => setTarget({ unit: unit.value as Unit }));
	// An empty or partly typed number reads as NaN; 0 stands for "no target" without putting NaN in the store.
	value.addEventListener("input", () =>
		setTarget({ value: Number.isFinite(value.valueAsNumber) ? value.valueAsNumber : 0 }),
	);

	function render({ showTarget: shown, target }: Readonly<State>) {
		showTarget.checked = shown;
		rule.value = target.rule;
		unit.value = target.unit;
		const typed = Number.isFinite(value.valueAsNumber) ? value.valueAsNumber : 0;
		if (typed !== target.value) value.value = target.value > 0 ? String(target.value) : "";
	}

	render(store.get());
	store.subscribe(render);
}
