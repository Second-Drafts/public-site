import { stored } from "../../lib/privacy/storage";
import { saveOnChange } from "../../lib/store";
import { validateState, type State, type Store } from "./lib/state";

const storedLadder = stored("la:ladder:v1");

export function restoreState(): State {
	return validateState(storedLadder.readJSON());
}

export function persistChanges(store: Store): void {
	saveOnChange(store, (state) => state, storedLadder.writeJSON, { delayMs: 500 });
}
