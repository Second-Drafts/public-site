import { required } from "../../lib/dom";
import { bindTextarea } from "../../lib/text-entry";
import type { Store } from "./lib/state";

export interface Editor {
	focusAtEnd(): void;
}

export function mountEditor(store: Store): Editor {
	const textarea = required<HTMLTextAreaElement>(document, "#ws-text");
	bindTextarea(textarea, store, "text");

	return {
		focusAtEnd() {
			textarea.focus();
			textarea.setSelectionRange(textarea.value.length, textarea.value.length);
		},
	};
}
