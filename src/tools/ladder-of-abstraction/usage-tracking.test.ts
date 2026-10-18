import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mergeShallow } from "../../lib/store";
import { track } from "../../lib/usage-reports";
import { startingRung } from "./lib/ladder";
import { INITIAL_STATE, type State, type Store } from "./lib/state";
import { trackUsage } from "./usage-tracking";

vi.mock("../../lib/usage-reports", () => ({ track: vi.fn() }));

const tracked = vi.mocked(track);

describe("trackUsage", () => {
	let store: Store;

	beforeEach(() => {
		tracked.mockClear();
		store = createStore(INITIAL_STATE, mergeShallow<State>);
	});

	it("reports which way a rung was added and how tall the ladder is, never its text", () => {
		store.set({ ladder: [{ ...startingRung("a"), text: "idea" }, startingRung("b")] });
		trackUsage(store).onRungAdded("down");
		expect(tracked).toHaveBeenCalledWith("la_rung_added", { direction: "down", rung_count: 2 });
	});

	it("reports a copy with how tall the ladder is", () => {
		store.set({ ladder: [{ ...startingRung("a"), text: "idea" }, startingRung("b")] });
		trackUsage(store).onCopied("passage");
		expect(tracked).toHaveBeenCalledWith("la_copied", { view: "passage", rung_count: 2 });
	});

	it("reports loading the example", () => {
		trackUsage(store).onExampleLoaded();
		expect(tracked).toHaveBeenCalledWith("la_example_loaded", {});
	});
});
