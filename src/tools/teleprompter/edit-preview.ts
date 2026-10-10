import { debounce } from "./lib/debounce";
import { required } from "./lib/dom";
import type { Settings } from "./lib/settings";
import type { Store } from "./lib/store";
import { createStage } from "./stage";

const TYPING_SETTLE_MS = 150;
const EMPTY_TEXT = "Your script will appear here.";
const NOT_DRAWN: readonly (keyof Settings)[] = ["speed", "countdown", "arrowKeys"];

function drawnSettingsChanged(next: Settings, previous: Settings): boolean {
	return (Object.keys(next) as (keyof Settings)[]).some((key) => !NOT_DRAWN.includes(key) && next[key] !== previous[key]);
}

export function mountEditPreview(store: Store): void {
	const root = required(document, "[data-tp-preview]");
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
