import { track } from "../../lib/usage-reports";
import { countWords, wordBucket } from "../../lib/text/measure";
import type { Store } from "./lib/state";

export function trackUsage(store: Store): void {
	store.subscribe((state, previous) => {
		if (state.sprint && !previous.sprint) track("ws_sprint_started", { minutes: state.sprint.minutes });
		if (state.finished && state.finished !== previous.finished) {
			track("ws_sprint_finished", {
				minutes: state.finished.minutes,
				word_bucket: wordBucket(countWords(state.text)),
			});
		}
	});
}
