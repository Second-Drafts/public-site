import { createStore, mergeShallow } from "../../lib/store";
import { mountEditor } from "./editor";
import type { State, Store } from "./lib/state";
import { persistChanges, restoreState } from "./persistence";
import { mountRhythmView } from "./rhythm-view";
import { openSharedDraft } from "./shared-draft";
import { trackUsage } from "./usage-tracking";

declare global {
	interface Window {
		__daStore?: Store;
	}
}

const store: Store = createStore(restoreState(), mergeShallow<State>);
if (import.meta.env.DEV) window.__daStore = store;

persistChanges(store);
const usage = trackUsage(store);

const editor = mountEditor(store, usage);
mountRhythmView(store, editor, usage);
void openSharedDraft(store, usage);
