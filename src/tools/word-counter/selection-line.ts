import { required } from "../../lib/dom";
import { summarizeSelection, type SelectionRange } from "./lib/selection";
import type { State, Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

export function mountSelectionLine(store: Store, usage: UsageHooks): void {
	const textarea = required<HTMLTextAreaElement>(document, "#wc-text");
	const line = required(document, "#wc-selection-line");
	const selected = required(document, "#wc-selection");
	const cut = required(document, "#wc-selection-cut");
	const cutLanding = required(document, "#wc-selection-landing");
	const cutStatus = required(document, "#wc-selection-status");

	function currentRange(): SelectionRange {
		return { start: textarea.selectionStart, end: textarea.selectionEnd };
	}

	let rendered: { state: Readonly<State>; start: number; end: number } | null = null;

	function render(state: Readonly<State> = store.get()) {
		const range = currentRange();
		const unchanged = rendered?.state === state && rendered.start === range.start && rendered.end === range.end;
		if (unchanged) return;
		rendered = { state, ...range };
		const summary = summarizeSelection(state, range);
		line.hidden = summary === null;
		if (!summary) return;
		usage.onSelectionCounted();
		selected.textContent = summary.selected;
		cut.hidden = summary.cut === null;
		if (!summary.cut) return;
		cutLanding.textContent = summary.cut.landing;
		cutStatus.textContent = summary.cut.evaluation.status;
		cut.dataset.state = summary.cut.evaluation.state;
	}

	const rerender = () => render();
	textarea.addEventListener("select", rerender);
	textarea.addEventListener("selectionchange", rerender);
	document.addEventListener("selectionchange", () => {
		if (document.activeElement === textarea) render();
	});
	store.subscribe(render);
	render();
}
