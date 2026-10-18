import type { Store as BaseStore } from "../../../lib/store";
import type { Answer, Deck } from "./answers";

export type ShakeMethod = "submit" | "click" | "keyboard" | "drag" | "device";

/** idle → shaking → settling → revealed. A shake during settling is too soon and clouds the window. */
export type Phase = "idle" | "shaking" | "settling" | "revealed";

export interface Shake {
	method: ShakeMethod;
	asked: boolean;
	tooSoon: boolean;
}

export interface Reading {
	question: string;
	answer: Answer;
	deck: Deck;
}

export interface State {
	phase: Phase;
	question: string;
	deck: Deck;
	/** The latest shake, set when shaking starts. */
	shake: Shake | null;
	/** What the window shows, set when the ball starts settling. */
	reading: Reading | null;
	/** This visit's readings, newest first. Never saved. */
	log: Reading[];
}

export type Store = BaseStore<State>;

export const INITIAL_STATE: State = {
	phase: "idle",
	question: "",
	deck: "classic",
	shake: null,
	reading: null,
	log: [],
};
