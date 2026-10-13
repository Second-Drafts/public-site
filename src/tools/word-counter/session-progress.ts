import { required } from "../../lib/dom";
import { sessionProgressText } from "./lib/session";
import { measureDraft, type State, type Store } from "./lib/state";

export function mountSessionProgress(store: Store): void {
	const progress = required(document, "#wc-session-progress");
	const baselineWords = measureDraft(store.get().text, "words");

	function render({ text }: Readonly<State>) {
		const change = measureDraft(text, "words") - baselineWords;
		progress.hidden = change === 0;
		progress.textContent = sessionProgressText(change);
	}

	render(store.get());
	store.subscribe((state, previous) => {
		if (state.text !== previous.text) render(state);
	});
}
