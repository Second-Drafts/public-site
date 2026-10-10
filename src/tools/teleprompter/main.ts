import { askConfirm } from "./confirm";
import { mountEditPreview } from "./edit-preview";
import { mountEditView } from "./edit-view";
import { initAnalytics, trackPageView } from "./lib/analytics";
import { defaultSettingsForViewport } from "./lib/defaults";
import { debounce } from "./lib/debounce";
import { SAMPLE_SCRIPT } from "./lib/sample";
import { validateSettings, type Settings } from "./lib/settings";
import { hasShareParam } from "./lib/share-hash";
import { KEYS, read, readJSON, write, writeJSON } from "./lib/storage";
import { createStore, type Store } from "./lib/store";
import { mountPromptView } from "./prompt-view";
import { mountSettingsPanel } from "./settings-panel";
import { trackUsage, type UsageHooks } from "./usage-tracking";

declare global {
	interface Window {
		/** Dev only: the live store, for browser-automation QA. */
		__tpStore?: Store;
	}
}

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

persistChanges(store);
const usage = trackUsage(store);

mountPromptView(store, usage);
const { showNotice } = mountEditView(store, usage);
document.querySelectorAll<HTMLElement>("[data-tp-settings]").forEach((root) => mountSettingsPanel(root, store));
mountEditPreview(store);

openShareLink(store, usage, showNotice);
// A share link pasted into a tab that is already on this page only changes the hash.
addEventListener("hashchange", () => openShareLink(store, usage, showNotice));

function persistChanges(store: Store) {
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
}

async function openShareLink(store: Store, usage: UsageHooks, showNotice: (message: string) => void) {
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
	usage.onShareLinkOpened();

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
	usage.onShareScriptApplied();
}
