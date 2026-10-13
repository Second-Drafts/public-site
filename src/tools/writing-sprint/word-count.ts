import { required } from "../../lib/dom";
import { countText } from "../../lib/text/readout";
import { countWords } from "../../lib/text/measure";
import type { State, Store } from "./lib/state";

export function mountWordCount(store: Store): void {
	const line = required(document, "#ws-word-count");

	function render({ text }: Readonly<State>) {
		line.textContent = countText(countWords(text), "words");
	}

	render(store.get());
	store.subscribe((state, previous) => {
		if (state.text !== previous.text) render(state);
	});
}
