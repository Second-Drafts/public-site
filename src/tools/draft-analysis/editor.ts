import { required } from "../../lib/dom";
import { attachTextHighlights, type TextHighlights } from "../../lib/text-highlights";
import type { State, Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

export interface Editor {
	textarea: HTMLTextAreaElement;
	highlights: TextHighlights;
}

export function mountEditor(store: Store, usage: UsageHooks): Editor {
	const textarea = required<HTMLTextAreaElement>(document, "#da-text");

	function render({ text }: Readonly<State>) {
		if (textarea.value !== text) textarea.value = text;
	}

	textarea.addEventListener("input", (event) => {
		store.set({ text: textarea.value });
		usage.onTextInput((event as InputEvent).inputType === "insertFromPaste" ? "paste" : "typed");
	});

	render(store.get());
	store.subscribe(render);
	return { textarea, highlights: attachTextHighlights(textarea) };
}
