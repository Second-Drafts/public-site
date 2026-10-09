/*
 * Edit preview: draws the script and the look-and-layout settings into the preview band, live from the
 * store. The drawing is the shared stage (stage.ts); this file only feeds it. Nothing plays here.
 * Markup: EditPreview.astro.
 */
import { required } from "./lib/dom";
import type { Settings } from "./lib/settings";
import { debounce } from "./lib/storage";
import type { Store } from "./lib/store";
import { createStage } from "./stage";

/** Typing settles for this long before the stage redraws the script. */
const TYPING_SETTLE_MS = 150;
const EMPTY_TEXT = "Your script will appear here.";
/** Settings the preview doesn't draw: they only matter while prompting. */
const NOT_DRAWN: readonly (keyof Settings)[] = ["speed", "countdown", "arrowKeys"];

/** Did anything the preview draws change? */
function drawnSettingsChanged(next: Settings, previous: Settings): boolean {
	return (Object.keys(next) as (keyof Settings)[]).some((key) => !NOT_DRAWN.includes(key) && next[key] !== previous[key]);
}

export function mountEditPreview(store: Store): void {
	const root = required(document, "[data-tp-preview]");
	const stage = createStage(required(root, "[data-tp-stage]"), { emptyMessage: EMPTY_TEXT });
	const mirrorFlag = required(root, '[data-tpv="mirror"]');
	const flipFlag = required(root, '[data-tpv="flip"]');
	/** Settings changed while the band was hidden behind the Prompt view; drawn when it comes back. */
	let stale = false;

	function renderScript() {
		stage.render(store.get().script);
	}
	const renderScriptSoon = debounce(renderScript, TYPING_SETTLE_MS);

	function renderSettings() {
		const { settings, view } = store.get();
		// The band is hidden while prompting (the Prompt view has its own stage): draw it when it returns.
		if (view === "prompt") {
			stale = true;
			return;
		}
		stale = false;
		mirrorFlag.hidden = !settings.mirror;
		flipFlag.hidden = !settings.flip;
		void stage.apply(settings);
	}

	store.subscribe((state, previous) => {
		if (state.script !== previous.script) renderScriptSoon();
		if (state.settings !== previous.settings && drawnSettingsChanged(state.settings, previous.settings)) renderSettings();
		else if (state.view !== previous.view && state.view === "edit" && stale) renderSettings();
	});
	renderScript();
	renderSettings();
}
