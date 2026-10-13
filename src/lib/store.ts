import { debounce } from "./debounce";

export type ChangeSource = "user" | "system";

export type Listener<State> = (state: Readonly<State>, previous: Readonly<State>, source: ChangeSource) => void;

export interface Store<State, Patch = Partial<State>> {
	get(): Readonly<State>;
	set(patch: Patch, source?: ChangeSource): void;
	subscribe(listener: Listener<State>): () => void;
}

export function mergeShallow<State>(state: State, patch: Partial<State>): State {
	return { ...state, ...patch };
}

export function createStore<State, Patch>(
	initial: State,
	apply: (state: State, patch: Patch) => State,
): Store<State, Patch> {
	let state = initial;
	const listeners = new Set<Listener<State>>();

	return {
		get: () => state,
		set(patch, source = "user") {
			const previous = state;
			state = apply(state, patch);
			for (const listener of listeners) listener(state, previous, source);
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

/** Saves the selected slice of state a beat after it changes, and anything still waiting when the page goes away. */
export function saveOnChange<State, Slice>(
	store: Store<State>,
	select: (state: Readonly<State>) => Slice,
	save: (slice: Slice) => void,
	{
		delayMs,
		changed = (now, before) => now !== before,
	}: { delayMs: number; changed?: (now: Slice, before: Slice) => boolean },
): void {
	const saveSoon = debounce(save, delayMs);
	store.subscribe((state, previous) => {
		const slice = select(state);
		if (changed(slice, select(previous))) saveSoon(slice);
	});
	addEventListener("pagehide", saveSoon.flush);
}
