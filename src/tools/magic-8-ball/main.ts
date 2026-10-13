import { createStore, mergeShallow } from "../../lib/store";
import { mountAnswerLog } from "./answer-log";
import { INITIAL_STATE, type State, type Store } from "./lib/state";
import { mountQuestionForm } from "./question-form";
import { mountScene } from "./scene";
import { mountShakeInputs } from "./shake-inputs";
import { mountShareDialog } from "./share-dialog";
import { trackUsage } from "./usage-tracking";

declare global {
	interface Window {
		__m8Store?: Store;
	}
}

const store: Store = createStore(INITIAL_STATE, mergeShallow<State>);
if (import.meta.env.DEV) window.__m8Store = store;

const usage = trackUsage(store);

const ball = mountScene(store);
mountShakeInputs(store, ball, usage);
mountQuestionForm(store);
mountAnswerLog(store);
mountShareDialog(store, usage);
