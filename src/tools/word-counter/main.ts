import { createStore, mergeShallow } from "../../lib/store";
import { mountCountLine } from "./count-line";
import { mountEditor } from "./editor";
import { INITIAL_STATE, type State, type Store } from "./lib/state";
import { mountTargetPanel } from "./target-panel";

declare global {
	interface Window {
		__wcStore?: Store;
	}
}

const store: Store = createStore(INITIAL_STATE, mergeShallow<State>);
if (import.meta.env.DEV) window.__wcStore = store;

mountEditor(store);
mountCountLine(store);
mountTargetPanel(store);
