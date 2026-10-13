import type { Store as BaseStore } from "../../../lib/store";
import type { FinishedSprint, Sprint } from "./sprint";

export interface State {
	text: string;
	sprint: Sprint | null;
	/** The last sprint that ran to the end. A stopped sprint leaves this null. */
	finished: FinishedSprint | null;
	timerHidden: boolean;
}

export type Store = BaseStore<State>;

export const INITIAL_STATE: State = {
	text: "",
	sprint: null,
	finished: null,
	timerHidden: false,
};
