import { required } from "../../lib/dom";
import { countWords } from "../../lib/text/measure";
import { sessionChange, sessionProgressText } from "./lib/session";
import type { State, Store } from "./lib/state";

export function mountSessionProgress(store: Store): void {
	const progress = required(document, "#wc-session-progress");
	const baselineWords = countWords(store.get().text);

	function render({ text }: Readonly<State>) {
		progress.textContent = sessionProgressText(sessionChange(baselineWords, countWords(text)));
	}

	render(store.get());
	store.subscribe((state, previous) => {
		if (state.text !== previous.text) render(state);
	});
}
