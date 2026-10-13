import { required } from "../../lib/dom";
import { attachTextHighlights, type TextHighlights } from "../../lib/text-highlights";
import type { State, Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

export interface Editor {
	highlights: TextHighlights;
}

export function mountEditor(store: Store, usage: UsageHooks): Editor {
	const textarea = required<HTMLTextAreaElement>(document, "#wc-text");

	function render({ text }: Readonly<State>) {
		// Only touch the textarea when the value really differs, so the caret stays where it is while typing.
		if (textarea.value !== text) textarea.value = text;
	}

	textarea.addEventListener("input", (event) => {
		store.set({ text: textarea.value });
		usage.onTextInput((event as InputEvent).inputType === "insertFromPaste" ? "paste" : "typed");
	});

	render(store.get());
	store.subscribe(render);
	return { highlights: attachTextHighlights(textarea) };
}
