import { required } from "../../lib/dom";
import type { State, Store } from "./lib/state";

export function mountEditor(store: Store): void {
	const textarea = required<HTMLTextAreaElement>(document, "#wc-text");

	function render({ text }: Readonly<State>) {
		// Only touch the textarea when the value really differs, so the caret stays where it is while typing.
		if (textarea.value !== text) textarea.value = text;
	}

	textarea.addEventListener("input", () => store.set({ text: textarea.value }));
	render(store.get());
	store.subscribe(render);
}
