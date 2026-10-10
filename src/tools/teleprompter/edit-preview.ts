import { debounce } from "./lib/debounce";
import { required } from "./lib/dom";
import type { Settings } from "./lib/settings";
import type { Store } from "./lib/store";
import { createStage } from "./stage";

/** Typing settles for this long before the stage redraws the script. */
const TYPING_SETTLE_MS = 150;
const EMPTY_TEXT = "Your script will appear here.";
/** Settings the preview doesn't draw: they only matter while prompting. */
const NOT_DRAWN: readonly (keyof Settings)[] = ["speed", "countdown", "arrowKeys"];

function drawnSettingsChanged(next: Settings, previous: Settings): boolean {
	return (Object.keys(next) as (keyof Settings)[]).some((key) => !NOT_DRAWN.includes(key) && next[key] !== previous[key]);
}

export function mountEditPreview(store: Store): void {
	const root = required(document, "[data-tp-preview]");
	// The Start and share buttons sit beside the stage, so they take its colours from the root.
	const stage = createStage(required(root, "[data-tp-stage]"), { emptyMessage: EMPTY_TEXT, themeTarget: root });
	const mirrorFlag = required(root, '[data-tpv="mirror"]');
	const flipFlag = required(root, '[data-tpv="flip"]');
	let settingsStaleWhileHidden = false;

	function renderScript() {
		stage.render(store.get().script);
	}
	const renderScriptSoon = debounce(renderScript, TYPING_SETTLE_MS);

	function renderSettings() {
		const { settings, view } = store.get();
		// The band is hidden while prompting (the Prompt view has its own stage): draw it when it returns.
		if (view === "prompt") {
			settingsStaleWhileHidden = true;
			return;
		}
		settingsStaleWhileHidden = false;
		mirrorFlag.hidden = !settings.mirror;
		flipFlag.hidden = !settings.flip;
		void stage.apply(settings);
	}

	store.subscribe((state, previous) => {
		if (state.script !== previous.script) renderScriptSoon();
		if (state.settings !== previous.settings && drawnSettingsChanged(state.settings, previous.settings)) renderSettings();
		else if (state.view !== previous.view && state.view === "edit" && settingsStaleWhileHidden) renderSettings();
	});
	renderScript();
	renderSettings();
}
