/*
 * A tiny observable store for the teleprompter's state. No framework: views subscribe and render
 * what changed. Listeners get the new and previous state so they can skip work, and the change source.
 */
import type { Settings } from "./settings";

export type View = "edit" | "prompt";

export interface State {
	script: string;
	settings: Settings;
	view: View;
}

/**
 * Who made a change. "user" is someone choosing something (the default); "system" is the tool applying
 * many values at once (a share link, Reset). Analytics only counts user choices.
 */
export type ChangeSource = "user" | "system";

export type Listener = (state: Readonly<State>, previous: Readonly<State>, source: ChangeSource) => void;

export interface Store {
	get(): Readonly<State>;
	/** Shallow-merge into state. `settings` is merged one level deeper, so set({ settings: { speed: 5 } }) works. */
	set(patch: Partial<Omit<State, "settings">> & { settings?: Partial<Settings> }, source?: ChangeSource): void;
	/** Returns an unsubscribe function. */
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
