import type { ShareMethod } from "./share-dialog";
import { track } from "../../lib/usage-reports";
import type { Store } from "./lib/state";

export interface UsageHooks {
	onShared(method: ShareMethod): void;
	onMotionPermission(granted: boolean): void;
}

export function trackUsage(store: Store): UsageHooks {
	store.subscribe((state, previous) => {
		const startedShaking = state.phase === "shaking" && previous.phase !== "shaking";
		if (!startedShaking || !state.shake) return;
		track("m8_shaken", {
			method: state.shake.method,
			asked: state.shake.asked,
			deck: state.deck,
			too_soon: state.shake.tooSoon,
		});
	});

	return {
		onShared: (method) => track("m8_shared", { method }),
		onMotionPermission: (granted) => track("m8_motion_permission", { granted }),
	};
}
