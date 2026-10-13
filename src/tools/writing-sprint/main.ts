import { createStore, mergeShallow } from "../../lib/store";
import { mountEditor } from "./editor";
import type { State, Store } from "./lib/state";
import { persistChanges, restoreState } from "./persistence";
import { mountSprintBar } from "./sprint-bar";
import { mountSprintSetup } from "./sprint-setup";
import { trackUsage } from "./usage-tracking";
import { mountWordCount } from "./word-count";

declare global {
	interface Window {
		__wsStore?: Store;
	}
}

const store: Store = createStore(restoreState(), mergeShallow<State>);
if (import.meta.env.DEV) window.__wsStore = store;

persistChanges(store);
trackUsage(store);

const editor = mountEditor(store);
mountSprintSetup(store, editor);
mountSprintBar(store, editor);
mountWordCount(store);
