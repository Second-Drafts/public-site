import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mergeShallow } from "../../lib/store";
import { track } from "../../lib/usage-reports";
import { startSprint } from "./lib/sprint";
import { INITIAL_STATE, type State, type Store } from "./lib/state";
import { trackUsage } from "./usage-tracking";

vi.mock("../../lib/usage-reports", () => ({ track: vi.fn() }));

const tracked = vi.mocked(track);

describe("trackUsage", () => {
	let store: Store;
	const sprint = startSprint(25, 0, 0);

	beforeEach(() => {
		tracked.mockClear();
		store = createStore(INITIAL_STATE, mergeShallow<State>);
		trackUsage(store);
	});

	it("reports a sprint starting once, with its length", () => {
		store.set({ sprint });
		store.set({ timerHidden: true });
		expect(tracked).toHaveBeenCalledTimes(1);
		expect(tracked).toHaveBeenCalledWith("ws_sprint_started", { minutes: 25 });
	});

	it("does not report a pause as a new sprint", () => {
		store.set({ sprint });
		store.set({ sprint: { ...sprint, resumedAt: null } });
		expect(tracked).toHaveBeenCalledTimes(1);
	});

	it("reports a finished sprint with the length of the draft, never its text", () => {
		store.set({ sprint, text: "one two three" });
		store.set({ sprint: null, finished: { minutes: 25, words: 3 } });
		expect(tracked).toHaveBeenLastCalledWith("ws_sprint_finished", { minutes: 25, word_bucket: "0-50" });
	});

	it("reports nothing when a sprint is stopped", () => {
		store.set({ sprint });
		store.set({ sprint: null, finished: null });
		expect(tracked).toHaveBeenCalledTimes(1);
	});
});
