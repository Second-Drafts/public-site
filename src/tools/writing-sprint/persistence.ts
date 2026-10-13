import { debounce } from "../../lib/debounce";
import { stored } from "../../lib/privacy/storage";
import { INITIAL_STATE, type State, type Store } from "./lib/state";

const storedText = stored("ws:text");

export function restoreState(): State {
	return { ...INITIAL_STATE, text: storedText.read() ?? INITIAL_STATE.text };
}

export function persistChanges(store: Store): void {
	const saveText = debounce((text: string) => storedText.write(text), 500);
	store.subscribe((state, previous) => {
		if (state.text !== previous.text) saveText(state.text);
	});
	addEventListener("pagehide", saveText.flush);
}
