import type { DraftTextSource } from "../../lib/analytics/events";
import { trackTextEntry, type TextInputSource } from "../../lib/text-entry";
import { wordBucket } from "../../lib/word-bucket";
import { track } from "../../lib/usage-reports";
import type { Store } from "./lib/state";

export interface UsageHooks {
	onTextInput(source: TextInputSource): void;
	onDraftReceivedFromSprint(): void;
	onRhythmSentenceClicked(): void;
}

export function trackUsage(store: Store): UsageHooks {
	const textEntry = trackTextEntry<DraftTextSource>(
		() => store.get().text,
		(source) => track("da_text_entered", { word_bucket: wordBucket(store.get().text), source }),
	);

	return {
		onTextInput: textEntry.input,
		onDraftReceivedFromSprint: () => textEntry.arrived("writing_sprint"),
		onRhythmSentenceClicked: () => track("da_rhythm_sentence_clicked", {}),
	};
}
