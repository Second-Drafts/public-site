import type { Store as BaseStore } from "../../../lib/store";

export interface State {
	text: string;
}

export type Store = BaseStore<State>;

export const INITIAL_STATE: State = { text: "" };
