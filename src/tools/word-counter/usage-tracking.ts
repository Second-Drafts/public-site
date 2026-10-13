import type { WordBucket } from "../../lib/analytics/events";
import { debounce } from "../../lib/debounce";
import { trackTextEntry, type TextInputSource } from "../../lib/text-entry";
import { countWords } from "../../lib/text/measure";
import { wordBucket } from "../../lib/word-bucket";
import { track } from "../../lib/usage-reports";
import { summarize, type Store } from "./lib/state";

const TARGET_SETTLE_MS = 1000;
const ENGAGED_WORDS = 50;
const ENGAGED_MS = 60_000;
const ENGAGED_CHECK_MS = 5000;

export interface UsageHooks {
	onTextInput(source: TextInputSource): void;
	onOpenedInTeleprompter(): void;
	onCutLineShown(): void;
	onSelectionCounted(): void;
}

export function trackUsage(store: Store): UsageHooks {
	const currentWordBucket = () => wordBucket(store.get().text);
	const textEntry = trackTextEntry(
		() => store.get().text,
		(source) => track("wc_text_entered", { word_bucket: currentWordBucket(), source }),
	);
	trackTargetChanges(store);
	trackTargetReached(store);
	trackEngagement(store, currentWordBucket);

	return {
		onTextInput: textEntry.input,
		onOpenedInTeleprompter: () => track("wc_opened_in_teleprompter", { word_bucket: currentWordBucket() }),
		onCutLineShown: onceAVisit(() => {
			const { rule, unit } = store.get().target;
			track("wc_cut_line_shown", { rule, unit });
		}),
		onSelectionCounted: onceAVisit(() => track("wc_selection_counted", {})),
	};
}

function onceAVisit(report: () => void): () => void {
	let reported = false;
	return () => {
		if (reported) return;
		reported = true;
		report();
	};
}

function trackTargetChanges(store: Store): void {
	const report = debounce(() => {
		const { showTarget, target, presetId } = store.get();
		if (!showTarget) return;
		track("wc_target_set", { preset: presetId, unit: target.unit, rule: target.rule });
	}, TARGET_SETTLE_MS);

	store.subscribe((state, previous, source) => {
		if (source !== "user") return;
		const changed =
			state.target !== previous.target ||
			state.presetId !== previous.presetId ||
			state.showTarget !== previous.showTarget;
		if (changed) report();
	});
	addEventListener("pagehide", report.flush);
}

function trackTargetReached(store: Store): void {
	const stop = store.subscribe((state, _previous, source) => {
		if (source !== "user" || state.text.trim() === "") return;
		if (summarize(state).evaluation?.state !== "met") return;
		stop();
		track("wc_target_reached", { preset: state.presetId, rule: state.target.rule });
	});
}

function trackEngagement(store: Store, currentWordBucket: () => WordBucket): void {
	let firstEditAt = 0;
	let reported = false;
	let timer: ReturnType<typeof setInterval> | undefined;

	function check() {
		if (reported || countWords(store.get().text) <= ENGAGED_WORDS) return;
		const elapsed = Date.now() - firstEditAt;
		if (elapsed < ENGAGED_MS) return;
		reported = true;
		clearInterval(timer);
		track("wc_engaged", { word_bucket: currentWordBucket(), duration_s: Math.round(elapsed / 1000) });
	}

	store.subscribe((state, previous, source) => {
		if (firstEditAt || source !== "user" || state.text === previous.text) return;
		firstEditAt = Date.now();
		timer = setInterval(check, ENGAGED_CHECK_MS);
	});
	addEventListener("pagehide", () => {
		if (firstEditAt) check();
	});
}
