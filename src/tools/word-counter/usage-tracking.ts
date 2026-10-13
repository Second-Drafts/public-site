import { track } from "../../lib/usage-reports";
import type { CounterTextSource, WordBucket } from "../../lib/analytics/events";
import { debounce } from "../../lib/debounce";
import { countWords, wordBucket } from "../../lib/text/measure";
import { activeTarget, summarize, type Store } from "./lib/state";

const TEXT_SETTLE_MS = 2000;
const TARGET_SETTLE_MS = 1000;
const ENGAGED_WORDS = 50;
const ENGAGED_MS = 60_000;
const ENGAGED_CHECK_MS = 5000;

export interface UsageHooks {
	onTextInput(source: "paste" | "typed"): void;
	onOpenedInTeleprompter(): void;
	onCutLineShown(): void;
	onSelectionCounted(): void;
	onSprintStarted(minutes: number): void;
	onSprintFinished(minutes: number): void;
	onRhythmOpened(): void;
	onRhythmSentenceClicked(): void;
}

export function trackUsage(store: Store): UsageHooks {
	const currentWordBucket = () => wordBucket(countWords(store.get().text));
	const textEntry = trackTextEntry(store, currentWordBucket);
	trackTargetChanges(store);
	trackTargetReached(store);
	trackEngagement(store, currentWordBucket);

	const onceAVisit = (report: () => void) => {
		let reported = false;
		return () => {
			if (reported) return;
			reported = true;
			report();
		};
	};

	return {
		onTextInput: textEntry.input,
		onOpenedInTeleprompter: () => track("wc_opened_in_teleprompter", { word_bucket: currentWordBucket() }),
		onCutLineShown: onceAVisit(() => {
			const { rule, unit } = store.get().target;
			track("wc_cut_line_shown", { rule, unit });
		}),
		onSelectionCounted: onceAVisit(() => track("wc_selection_counted", {})),
		onSprintStarted: (minutes) => track("wc_sprint_started", { minutes }),
		onSprintFinished: (minutes) => track("wc_sprint_finished", { minutes, word_bucket: currentWordBucket() }),
		onRhythmOpened: () => track("wc_rhythm_opened", {}),
		onRhythmSentenceClicked: () => track("wc_rhythm_sentence_clicked", {}),
	};
}

function trackTextEntry(store: Store, currentWordBucket: () => WordBucket) {
	let reported = false;
	function report(source: CounterTextSource) {
		if (reported || store.get().text.trim() === "") return;
		reported = true;
		track("wc_text_entered", { word_bucket: currentWordBucket(), source });
	}

	let pendingSource: "paste" | "typed" | null = null;
	const settle = debounce(() => {
		if (pendingSource) report(pendingSource);
		pendingSource = null;
	}, TEXT_SETTLE_MS);

	report("restored");

	return {
		input(source: "paste" | "typed") {
			if (source === "paste" || !pendingSource) pendingSource = source;
			settle();
		},
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
	let reported = false;
	store.subscribe((state, _previous, source) => {
		const target = activeTarget(state);
		if (reported || source !== "user" || !target || state.text.trim() === "") return;
		if (summarize(state).evaluation?.state !== "met") return;
		reported = true;
		track("wc_target_reached", { preset: state.presetId, rule: target.rule });
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
