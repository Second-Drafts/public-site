import type { DraftTextSource } from "../../lib/analytics/events";
import { debounce } from "../../lib/debounce";
import { countWords, wordBucket } from "../../lib/text/measure";
import { track } from "../../lib/usage-reports";
import type { Store } from "./lib/state";

const TEXT_SETTLE_MS = 2000;

export interface UsageHooks {
	onTextInput(source: "paste" | "typed"): void;
	onDraftReceivedFromSprint(): void;
	onRhythmSentenceClicked(): void;
}

export function trackUsage(store: Store): UsageHooks {
	let reported = false;
	function reportTextEntered(source: DraftTextSource) {
		const { text } = store.get();
		if (reported || text.trim() === "") return;
		reported = true;
		track("da_text_entered", { word_bucket: wordBucket(countWords(text)), source });
	}

	let pendingSource: "paste" | "typed" | null = null;
	const settle = debounce(() => {
		if (pendingSource) reportTextEntered(pendingSource);
		pendingSource = null;
	}, TEXT_SETTLE_MS);

	reportTextEntered("restored");

	return {
		onTextInput(source) {
			if (source === "paste" || !pendingSource) pendingSource = source;
			settle();
		},
		onDraftReceivedFromSprint: () => reportTextEntered("writing_sprint"),
		onRhythmSentenceClicked: () => track("da_rhythm_sentence_clicked", {}),
	};
}
