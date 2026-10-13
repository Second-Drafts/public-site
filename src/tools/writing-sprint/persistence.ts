import { stored } from "../../lib/privacy/storage";
import { saveOnChange } from "../../lib/store";
import { INITIAL_STATE, type State, type Store } from "./lib/state";

const storedText = stored("ws:text");

export function restoreState(): State {
	return { ...INITIAL_STATE, text: storedText.read() ?? INITIAL_STATE.text };
}

export function persistChanges(store: Store): void {
	saveOnChange(store, (state) => state.text, storedText.write, { delayMs: 500 });
}
