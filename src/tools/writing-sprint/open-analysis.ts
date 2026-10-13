import { required } from "../../lib/dom";
import { mountHandOffLink } from "../../lib/hand-off";
import type { Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

export function mountOpenAnalysis(store: Store, usage: UsageHooks): void {
	mountHandOffLink(required<HTMLAnchorElement>(document, "#ws-open-analysis"), store, {
		path: "/tools/draft-analysis",
		origin: "writing_sprint",
		isShown: ({ finished, text }) => finished !== null && text.trim() !== "",
		onOpen: usage.onOpenedAnalysis,
	});
}
