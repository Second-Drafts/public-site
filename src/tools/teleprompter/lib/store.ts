import { createStore as createBaseStore, type Store as BaseStore } from "../../../lib/store";
import type { Settings } from "./settings";

export type View = "edit" | "prompt";

export interface State {
	script: string;
	settings: Settings;
	view: View;
}

export type Patch = Partial<Omit<State, "settings">> & { settings?: Partial<Settings> };

export type Store = BaseStore<State, Patch>;

export function createStore(initial: State): Store {
	return createBaseStore(initial, applyPatch);
}

function applyPatch(state: State, patch: Patch): State {
	return {
		...state,
		...patch,
		settings: patch.settings ? { ...state.settings, ...patch.settings } : state.settings,
	};
}
