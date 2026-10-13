import { required } from "../../lib/dom";
import { bindTextarea } from "../../lib/text-entry";
import { attachTextHighlights, type TextHighlights } from "../../lib/text-highlights";
import type { Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

export interface Editor {
	textarea: HTMLTextAreaElement;
	highlights: TextHighlights;
}

export function mountEditor(store: Store, usage: UsageHooks): Editor {
	const textarea = required<HTMLTextAreaElement>(document, "#da-text");
	bindTextarea(textarea, store, "text", usage.onTextInput);
	return { textarea, highlights: attachTextHighlights(textarea) };
}
