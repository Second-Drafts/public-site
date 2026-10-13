import { createStore, mergeShallow } from "../../lib/store";
import { mountCountLine } from "./count-line";
import { mountCutLine } from "./cut-line";
import { mountEditor } from "./editor";
import type { State, Store } from "./lib/state";
import { persistChanges, restoreState } from "./persistence";
import { mountRhythmStrip } from "./rhythm-strip";
import { mountSelectionLine } from "./selection-line";
import { mountSessionProgress } from "./session-progress";
import { trackUsage } from "./usage-tracking";
import { mountTargetPanel } from "./target-panel";

declare global {
	interface Window {
		__wcStore?: Store;
	}
}

const store: Store = createStore(restoreState(), mergeShallow<State>);
if (import.meta.env.DEV) window.__wcStore = store;

persistChanges(store);
const usage = trackUsage(store);

const editor = mountEditor(store, usage);
mountCountLine(store);
mountSelectionLine(store, usage);
mountCutLine(store, editor.highlights, usage);
mountTargetPanel(store);
mountRhythmStrip(store, editor.highlights, usage);
mountSessionProgress(store);
