import { required } from "../../lib/dom";
import { mountHandOffLink } from "../../lib/hand-off";
import type { Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

export function mountOpenInTeleprompter(store: Store, usage: UsageHooks): void {
	mountHandOffLink(required<HTMLAnchorElement>(document, "#wc-open-teleprompter"), store, {
		path: "/tools/teleprompter",
		origin: "word_counter",
		onOpen: usage.onOpenedInTeleprompter,
	});
}
