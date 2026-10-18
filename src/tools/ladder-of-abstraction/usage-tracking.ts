import { track } from "../../lib/usage-reports";
import type { LadderHooks } from "./ladder-view";
import type { ToolHooks } from "./ladder-tools";
import type { Store } from "./lib/state";

export function trackUsage(store: Store): LadderHooks & ToolHooks {
	const rungCount = () => store.get().ladder.length;

	return {
		onRungAdded: (direction) => track("la_rung_added", { direction, rung_count: rungCount() }),
		onCopied: (view) => track("la_copied", { view, rung_count: rungCount() }),
		onExampleLoaded: () => track("la_example_loaded", {}),
	};
}
