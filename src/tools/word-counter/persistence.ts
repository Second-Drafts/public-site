import { stored } from "../../lib/privacy/storage";
import { saveOnChange } from "../../lib/store";
import type { State, Store } from "./lib/state";
import { pickSettings, validateSettings, type Settings } from "./lib/settings";

const storedText = stored("wc:text");
const storedSettings = stored("wc:settings:v1");

export function restoreState(): State {
	return { text: storedText.read() ?? "", ...validateSettings(storedSettings.readJSON()) };
}

function settingsChanged(now: Settings, before: Settings): boolean {
	return (Object.keys(now) as (keyof Settings)[]).some((key) => now[key] !== before[key]);
}

export function persistChanges(store: Store): void {
	saveOnChange(store, (state) => state.text, storedText.write, { delayMs: 500 });
	saveOnChange(store, pickSettings, storedSettings.writeJSON, { delayMs: 300, changed: settingsChanged });
}
