import { track } from "./lib/analytics";
import type { ScriptSource, TpEvents, TrackedSetting, WordBucket } from "./lib/analytics/events";
import { debounce } from "./lib/debounce";
import { SAMPLE_SCRIPT } from "./lib/sample";
import type { Settings } from "./lib/settings";
import type { Store } from "./lib/store";
import { countWords, wordBucket } from "./lib/timing";

const SCRIPT_SETTLE_MS = 2000;
const SETTING_SETTLE_MS = 1000;
const ENGAGED_WORDS = 200;
const ENGAGED_MS = 60_000;
const ENGAGED_CHECK_MS = 5000;
const TRACKED_SETTINGS: TrackedSetting[] = ["font", "theme", "mirror", "flip", "guide", "arrowKeys", "guideColor"];

export interface UsageHooks {
	onPlay(): void;
	onReachedEnd(): void;
	onScriptInput(source: "paste" | "typed"): void;
	onShareCopied(tooLong: boolean): void;
	onShareLinkOpened(): void;
	onShareScriptApplied(): void;
}

export function trackUsage(store: Store): UsageHooks {
	const currentWordBucket = () => wordBucket(countWords(store.get().script));
	const scriptEntry = trackScriptEntry(store, currentWordBucket);
	const promptSession = trackPromptSession(store, currentWordBucket, scriptEntry.report);
	trackSettingChanges(store);

	return {
		onPlay: promptSession.play,
		onReachedEnd: promptSession.reachedEnd,
		onScriptInput: scriptEntry.input,
		onShareCopied: (tooLong) => track("tp_share_link_copied", { word_bucket: currentWordBucket(), too_long: tooLong }),
		onShareLinkOpened: () => track("tp_share_link_opened", {}),
		onShareScriptApplied: () => scriptEntry.report("share_link"),
	};
}

function trackSettingChanges(store: Store): void {
	const pending = new Map<TrackedSetting, Settings[TrackedSetting]>();
	const report = debounce(() => {
		for (const [setting, value] of pending) {
			track("tp_setting_changed", { setting, value } as TpEvents["tp_setting_changed"]);
		}
		pending.clear();
	}, SETTING_SETTLE_MS);

	store.subscribe((state, previous, source) => {
		if (source !== "user" || state.settings === previous.settings) return;
		for (const setting of TRACKED_SETTINGS) {
			if (state.settings[setting] !== previous.settings[setting]) pending.set(setting, state.settings[setting]);
		}
		if (pending.size > 0) report();
	});
	addEventListener("pagehide", report.flush);
}

function trackScriptEntry(store: Store, currentWordBucket: () => WordBucket) {
	const reported = new Set<string>();
	function report(source: ScriptSource) {
		const word_bucket = currentWordBucket();
		const key = `${source}:${word_bucket}`;
		if (store.get().script.trim() === "" || reported.has(key)) return;
		reported.add(key);
		track("tp_script_entered", { word_bucket, source });
	}

	let pendingSource: "paste" | "typed" | null = null;
	const settle = debounce(() => {
		if (pendingSource) report(pendingSource);
		pendingSource = null;
	}, SCRIPT_SETTLE_MS);

	return {
		report,
		input(source: "paste" | "typed") {
			if (source === "paste" || !pendingSource) pendingSource = source;
			settle();
		},
	};
}

function trackPromptSession(store: Store, currentWordBucket: () => WordBucket, reportScriptEntered: (source: ScriptSource) => void) {
	let openedAt = 0;
	let firstPlayAt = 0;
	let reachedEnd = false;
	let playCount = 0;
	let engagedSent = false;
	let engagedTimer: ReturnType<typeof setInterval> | undefined;

	function checkEngaged() {
		if (engagedSent || !firstPlayAt || countWords(store.get().script) <= ENGAGED_WORDS) return;
		const elapsed = Date.now() - firstPlayAt;
		if (elapsed < ENGAGED_MS) return;
		engagedSent = true;
		track("tp_engaged", { word_bucket: currentWordBucket(), duration_s: Math.round(elapsed / 1000) });
	}

	function open() {
		const { script, settings } = store.get();
		openedAt = Date.now();
		firstPlayAt = 0;
		reachedEnd = false;
		if (script === SAMPLE_SCRIPT) reportScriptEntered("sample");
		track("tp_prompt_started", {
			font: settings.font,
			theme: settings.theme,
			speed: settings.speed,
			mirror: settings.mirror,
			word_bucket: currentWordBucket(),
		});
		engagedTimer = setInterval(checkEngaged, ENGAGED_CHECK_MS);
	}

	function close() {
		if (!openedAt) return;
		clearInterval(engagedTimer);
		checkEngaged();
		track("tp_completed", {
			reached_end: reachedEnd,
			duration_s: Math.round((Date.now() - openedAt) / 1000),
			word_bucket: currentWordBucket(),
		});
		openedAt = 0;
	}

	store.subscribe((state, previous) => {
		if (state.view === previous.view) return;
		if (state.view === "prompt") open();
		else close();
	});
	addEventListener("pagehide", close);

	return {
		play() {
			playCount += 1;
			if (!firstPlayAt) firstPlayAt = Date.now();
			track("tp_play", { word_bucket: currentWordBucket(), play_count: playCount });
		},
		reachedEnd() {
			reachedEnd = true;
		},
	};
}
