/*
 * Teleprompter entry point: builds the store from storage and any share link, mounts the views,
 * persists changes and reports analytics. Each view module owns its own DOM; this file only wires them.
 */
import { askConfirm } from "./confirm";
import { mountEditPreview } from "./edit-preview";
import { mountEditView, showNotice } from "./edit-view";
import { initAnalytics, track, trackPageView } from "./lib/analytics";
import type { ScriptSource, TpEvents, TrackedSetting } from "./lib/analytics/events";
import { defaultSettingsForViewport } from "./lib/defaults";
import { SAMPLE_SCRIPT } from "./lib/sample";
import { validateSettings, type Settings } from "./lib/settings";
import { hasShareParam } from "./lib/share-hash";
import { debounce, KEYS, read, readJSON, write, writeJSON } from "./lib/storage";
import { createStore, type Store } from "./lib/store";
import { countWords, wordBucket } from "./lib/timing";
import { mountPromptView } from "./prompt-view";
import { mountSettingsPanel } from "./settings-panel";

declare global {
	interface Window {
		/** Dev only: the live store, for browser-automation QA. */
		__tpStore?: Store;
	}
}

/** How long typing has to settle before it counts as "entered a script". */
const SCRIPT_SETTLE_MS = 2000;
/** The "real interest" threshold (spec §3). */
const ENGAGED_WORDS = 200;
const ENGAGED_MS = 60_000;
const TRACKED_SETTINGS: TrackedSetting[] = ["font", "theme", "mirror", "flip", "guide", "arrowKeys", "guideColor"];
/** A setting has to rest this long before its change is reported, so a colour or slider drag is one event. */
const SETTING_SETTLE_MS = 1000;

initAnalytics();
trackPageView({ referrer: document.referrer, hash: location.hash });

const savedScript = read(KEYS.script);
const savedSettings = readJSON(KEYS.settings);
const store = createStore({
	// A first visit gets the sample; an empty saved script means the user cleared it, so keep it empty.
	script: savedScript ?? SAMPLE_SCRIPT,
	settings: savedSettings === undefined ? defaultSettingsForViewport() : validateSettings(savedSettings),
	view: "edit",
});
if (import.meta.env.DEV) window.__tpStore = store;

const bucket = () => wordBucket(countWords(store.get().script));

/* ------------------------------------------------------------------ persistence */

const saveScript = debounce((script: string) => write(KEYS.script, script), 500);
const saveSettings = debounce((settings: Settings) => writeJSON(KEYS.settings, settings), 300);
store.subscribe((state, previous) => {
	if (state.script !== previous.script) saveScript(state.script);
	if (state.settings !== previous.settings) saveSettings(state.settings);
});
addEventListener("pagehide", () => {
	saveScript.flush();
	saveSettings.flush();
});

/* ------------------------------------------------------------------ settings analytics */

// Only the reader's own choices count: share links and Reset are "system" changes.
const pendingSettings = new Map<TrackedSetting, Settings[TrackedSetting]>();
const reportSettings = debounce(() => {
	for (const [setting, value] of pendingSettings) {
		track("tp_setting_changed", { setting, value } as TpEvents["tp_setting_changed"]);
	}
	pendingSettings.clear();
}, SETTING_SETTLE_MS);
store.subscribe((state, previous, source) => {
	if (source !== "user" || state.settings === previous.settings) return;
	for (const setting of TRACKED_SETTINGS) {
		if (state.settings[setting] !== previous.settings[setting]) pendingSettings.set(setting, state.settings[setting]);
	}
	if (pendingSettings.size > 0) reportSettings();
});
addEventListener("pagehide", reportSettings.flush);

/* ------------------------------------------------------------------ script entered */

const reportedEntries = new Set<string>();
function reportScriptEntered(source: ScriptSource) {
	const word_bucket = bucket();
	const key = `${source}:${word_bucket}`;
	if (store.get().script.trim() === "" || reportedEntries.has(key)) return;
	reportedEntries.add(key);
	track("tp_script_entered", { word_bucket, source });
}
// A paste anywhere in the settle window wins over typing: pasting a script is the stronger signal.
let pendingSource: "paste" | "typed" | null = null;
const settleScript = debounce(() => {
	if (pendingSource) reportScriptEntered(pendingSource);
	pendingSource = null;
}, SCRIPT_SETTLE_MS);

/* ------------------------------------------------------------------ prompt session */

let promptOpenedAt = 0;
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
	track("tp_engaged", { word_bucket: bucket(), duration_s: Math.round(elapsed / 1000) });
}

function promptOpened() {
	const { script, settings } = store.get();
	promptOpenedAt = Date.now();
	firstPlayAt = 0;
	reachedEnd = false;
	if (script === SAMPLE_SCRIPT) reportScriptEntered("sample");
	track("tp_prompt_started", {
		font: settings.font,
		theme: settings.theme,
		speed: settings.speed,
		mirror: settings.mirror,
		word_bucket: bucket(),
	});
	engagedTimer = setInterval(checkEngaged, 5000);
}

function promptClosed() {
	if (!promptOpenedAt) return;
	clearInterval(engagedTimer);
	checkEngaged();
	track("tp_completed", {
		reached_end: reachedEnd,
		duration_s: Math.round((Date.now() - promptOpenedAt) / 1000),
		word_bucket: bucket(),
	});
	promptOpenedAt = 0;
}

store.subscribe((state, previous) => {
	if (state.view === previous.view) return;
	if (state.view === "prompt") promptOpened();
	else promptClosed();
});
addEventListener("pagehide", promptClosed);

/* ------------------------------------------------------------------ mount */

mountPromptView(store, {
	onPlay() {
		playCount += 1;
		if (!firstPlayAt) firstPlayAt = Date.now();
		track("tp_play", { word_bucket: bucket(), play_count: playCount });
	},
	onReachedEnd() {
		reachedEnd = true;
	},
});
mountEditView(store, {
	onScriptInput(source) {
		if (source === "paste" || !pendingSource) pendingSource = source;
		settleScript();
	},
	onShareCopied(tooLong) {
		track("tp_share_link_copied", { word_bucket: bucket(), too_long: tooLong });
	},
});
document.querySelectorAll<HTMLElement>("[data-tp-settings]").forEach((root) => mountSettingsPanel(root, store));
mountEditPreview(store);

/* ------------------------------------------------------------------ share link */

openShareLink();
// A share link pasted into a tab that is already on this page only changes the hash.
addEventListener("hashchange", openShareLink);

async function openShareLink() {
	if (!hasShareParam(location.hash)) return;
	const { decodeShareHash } = await import("./lib/share");
	const shared = decodeShareHash(location.hash);
	// Strip the hash first, so a reload doesn't ask again and the script isn't left in the address bar.
	history.replaceState(null, "", location.pathname + location.search);
	if (store.get().view === "prompt") store.set({ view: "edit" });
	if (!shared) {
		showNotice("That share link couldn't be opened. It may have been cut short when it was copied.");
		return;
	}
	track("tp_share_link_opened", {});

	const current = store.get().script;
	const overwrites = current.trim() !== "" && current !== shared.script && current !== SAMPLE_SCRIPT;
	if (overwrites) {
		const replace = await askConfirm({
			title: "Open the shared script?",
			body: "It will replace the script saved in this browser. Your current script can't be recovered after this.",
			confirmLabel: "Replace my script",
			cancelLabel: "Keep mine",
			destructive: true,
		});
		if (!replace) return;
	}
	store.set({ script: shared.script, settings: shared.settings }, "system");
	reportScriptEntered("share_link");
}

