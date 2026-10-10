import type { Settings } from "./settings";

export type View = "edit" | "prompt";

export interface State {
	script: string;
	settings: Settings;
	view: View;
}

export type ChangeSource = "user" | "system";

export type Listener = (state: Readonly<State>, previous: Readonly<State>, source: ChangeSource) => void;

export interface Store {
	get(): Readonly<State>;
	set(patch: Partial<Omit<State, "settings">> & { settings?: Partial<Settings> }, source?: ChangeSource): void;
	subscribe(listener: Listener): () => void;
}

export function createStore(initial: State): Store {
	let state: State = initial;
	const listeners = new Set<Listener>();

	return {
		get: () => state,
		set(patch, source = "user") {
			const previous = state;
			state = {
				...state,
				...patch,
				settings: patch.settings ? { ...state.settings, ...patch.settings } : state.settings,
			};
			for (const listener of listeners) listener(state, previous, source);
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}
