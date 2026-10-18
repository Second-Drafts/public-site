import { createStore, mergeShallow } from "../../lib/store";
import { mountLadderTools } from "./ladder-tools";
import { mountLadderView } from "./ladder-view";
import type { State, Store } from "./lib/state";
import { mountPassageView } from "./passage-view";
import { persistChanges, restoreState } from "./persistence";
import { trackUsage } from "./usage-tracking";

declare global {
	interface Window {
		__laStore?: Store;
	}
}

const store: Store = createStore(restoreState(), mergeShallow<State>);
if (import.meta.env.DEV) window.__laStore = store;

persistChanges(store);
const usage = trackUsage(store);

mountLadderView(store, usage);
mountPassageView(store);
mountLadderTools(store, usage);
