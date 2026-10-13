import { required } from "../../lib/dom";
import { countWords } from "../../lib/text/measure";
import { sessionChange, sessionProgressText } from "./lib/session";
import type { State, Store } from "./lib/state";

export function mountSessionProgress(store: Store): void {
	const progress = required(document, "#wc-session-progress");
	const baselineWords = countWords(store.get().text);

	function render({ text }: Readonly<State>) {
		const change = sessionChange(baselineWords, countWords(text));
		progress.hidden = change === 0;
		progress.textContent = sessionProgressText(change);
	}

	render(store.get());
	store.subscribe((state, previous) => {
		if (state.text !== previous.text) render(state);
	});
}
