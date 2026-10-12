import { createStore, mergeShallow } from "../../lib/store";
import { mountCountLine } from "./count-line";
import { mountEditor } from "./editor";
import type { State, Store } from "./lib/state";
import { persistChanges, restoreState } from "./persistence";
import { mountTargetPanel } from "./target-panel";

declare global {
	interface Window {
		__wcStore?: Store;
	}
}

const store: Store = createStore(restoreState(), mergeShallow<State>);
if (import.meta.env.DEV) window.__wcStore = store;

persistChanges(store);

mountEditor(store);
mountCountLine(store);
mountTargetPanel(store);
