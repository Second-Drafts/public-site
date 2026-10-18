import { beforeEach, describe, expect, it, vi } from "vitest";
import { createStore, mergeShallow } from "../../lib/store";
import { track } from "../../lib/usage-reports";
import { INITIAL_STATE, type Shake, type State, type Store } from "./lib/state";
import { trackUsage, type UsageHooks } from "./usage-tracking";

vi.mock("../../lib/usage-reports", () => ({ track: vi.fn() }));

const tracked = vi.mocked(track);

describe("trackUsage", () => {
	let store: Store;
	let usage: UsageHooks;
	const shake: Shake = { method: "click", asked: true, tooSoon: false };

	beforeEach(() => {
		tracked.mockClear();
		store = createStore(INITIAL_STATE, mergeShallow<State>);
		usage = trackUsage(store);
	});

	it("reports one shake once, with how it happened", () => {
		store.set({ phase: "shaking", shake, deck: "writers" });
		store.set({ question: "Will it sell?" });
		expect(tracked).toHaveBeenCalledTimes(1);
		expect(tracked).toHaveBeenCalledWith("m8_shaken", {
			method: "click",
			asked: true,
			deck: "writers",
			too_soon: false,
		});
	});

	it("reports a shake that comes too soon after settling", () => {
		store.set({ phase: "settling" });
		store.set({ phase: "shaking", shake: { ...shake, method: "device", tooSoon: true } });
		expect(tracked).toHaveBeenCalledTimes(1);
		expect(tracked).toHaveBeenCalledWith("m8_shaken", {
			method: "device",
			asked: true,
			deck: "classic",
			too_soon: true,
		});
	});

	it("reports nothing for other changes", () => {
		store.set({ question: "Is it done?" });
		store.set({ deck: "writers" });
		store.set({ phase: "settling" });
		store.set({ phase: "revealed" });
		store.set({ phase: "idle" });
		expect(tracked).not.toHaveBeenCalled();
	});

	it("reports sharing with its method", () => {
		usage.onShared("download");
		expect(tracked).toHaveBeenCalledWith("m8_shared", { method: "download" });
	});

	it("reports the motion permission outcome", () => {
		usage.onMotionPermission(false);
		expect(tracked).toHaveBeenCalledWith("m8_motion_permission", { granted: false });
	});

	it("never sends the question", () => {
		const question = "Does my secret novel have a chance?";
		store.set({ question, phase: "shaking", shake });
		usage.onShared("copy");
		usage.onMotionPermission(true);
		const sent = JSON.stringify(tracked.mock.calls);
		expect(sent).not.toContain(question);
		expect(sent).not.toContain("secret");
	});
});
