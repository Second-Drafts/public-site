import { required } from "../../lib/dom";
import { countWords } from "../../lib/text/measure";
import { wordsText } from "./lib/sprint";
import type { State, Store } from "./lib/state";

export function mountWordCount(store: Store): void {
	const line = required(document, "#ws-word-count");

	function render({ text }: Readonly<State>) {
		line.textContent = wordsText(countWords(text));
	}

	render(store.get());
	store.subscribe(render);
}
