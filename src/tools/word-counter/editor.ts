import { askConfirm } from "../../lib/confirm";
import { required } from "../../lib/dom";
import type { State, Store } from "./lib/state";

export function mountEditor(store: Store): void {
	const textarea = required<HTMLTextAreaElement>(document, "#wc-text");

	const clear = required<HTMLButtonElement>(document, "#wc-clear");

	function render({ text }: Readonly<State>) {
		// Only touch the textarea when the value really differs, so the caret stays where it is while typing.
		if (textarea.value !== text) textarea.value = text;
		clear.disabled = text === "";
	}

	textarea.addEventListener("input", () => store.set({ text: textarea.value }));
	clear.addEventListener("click", async () => {
		const confirmed = await askConfirm({
			title: "Clear your text?",
			body: "This removes it from this browser. You can't undo it.",
			confirmLabel: "Clear text",
			cancelLabel: "Keep it",
			destructive: true,
		});
		if (!confirmed) return;
		store.set({ text: "" });
		textarea.focus();
	});

	render(store.get());
	store.subscribe(render);
}
