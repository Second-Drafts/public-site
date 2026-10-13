import { takeHandOffFromUrl } from "../../lib/hand-off-hash";
import { stored } from "../../lib/privacy/storage";
import { askConfirm } from "../../lib/confirm";
import { mountEditPreview } from "./edit-preview";
import { mountEditView } from "./edit-view";
import { defaultSettingsForViewport } from "./lib/defaults";
import { removeRetiredStorage } from "./lib/retired-storage";
import { SAMPLE_SCRIPT } from "./lib/sample";
import { validateSettings } from "./lib/settings";
import { saveOnChange } from "../../lib/store";
import { createStore, type Store } from "./lib/store";
import { mountPromptView } from "./prompt-view";
import { mountSettingsPanel } from "./settings-panel";
import { trackUsage, type UsageHooks } from "./usage-tracking";

declare global {
	interface Window {
		__tpStore?: Store;
	}
}

removeRetiredStorage();

const storedScript = stored("tp:script");
const storedSettings = stored("tp:settings:v1");
const savedScript = storedScript.read();
const savedSettings = storedSettings.readJSON();
const store = createStore({
	// Only a first visit gets the sample: an empty saved script was cleared on purpose.
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
addEventListener("hashchange", () => openShareLink(store, usage, showNotice));

function persistChanges(store: Store) {
	saveOnChange(store, (state) => state.script, storedScript.write, { delayMs: 500 });
	saveOnChange(store, (state) => state.settings, storedSettings.writeJSON, { delayMs: 300 });
}

async function openShareLink(store: Store, usage: UsageHooks, showNotice: (message: string) => void) {
	const handOff = await takeHandOffFromUrl();
	if (handOff === undefined) return;
	if (store.get().view === "prompt") store.set({ view: "edit" });
	if (!handOff) {
		showNotice("That share link couldn't be opened. It may have been cut short when it was copied.");
		return;
	}
	const { sharedScript } = await import("./lib/share");
	const shared = sharedScript(handOff);
	const fromWordCounter = shared.origin === "word_counter";
	if (!fromWordCounter) usage.onShareLinkOpened();

	const current = store.get().script;
	const overwrites = current.trim() !== "" && current !== shared.script && current !== SAMPLE_SCRIPT;
	if (overwrites) {
		const replace = await askConfirm({
			title: fromWordCounter ? "Open this text in the teleprompter?" : "Open the shared script?",
			body: "It will replace the script saved in this browser. Your current script can't be recovered after this.",
			confirmLabel: "Replace my script",
			cancelLabel: "Keep mine",
			destructive: true,
		});
		if (!replace) return;
	}
	store.set({ script: shared.script, ...(shared.settings && { settings: shared.settings }) }, "system");
	usage.onSharedScriptApplied(fromWordCounter ? "word_counter" : "share_link");
}
