import { debounce } from "../../lib/debounce";
import { stored } from "../../lib/privacy/storage";
import { INITIAL_STATE, type State, type Store } from "./lib/state";
import { pickSettings, validateSettings, type Settings } from "./lib/settings";

const storedText = stored("wc:text");
const storedSettings = stored("wc:settings:v1");

export function restoreState(): State {
	const savedSettings = storedSettings.readJSON();
	return {
		...INITIAL_STATE,
		text: storedText.read() ?? INITIAL_STATE.text,
		...(savedSettings === undefined ? {} : validateSettings(savedSettings)),
	};
}

function settingsChanged(state: State, previous: State): boolean {
	const now = pickSettings(state);
	const before = pickSettings(previous);
	return (Object.keys(now) as (keyof Settings)[]).some((key) => now[key] !== before[key]);
}

export function persistChanges(store: Store): void {
	const saveText = debounce((text: string) => storedText.write(text), 500);
	const saveSettings = debounce((settings: Settings) => storedSettings.writeJSON(settings), 300);
	store.subscribe((state, previous) => {
		if (state.text !== previous.text) saveText(state.text);
		if (settingsChanged(state, previous)) saveSettings(pickSettings(state));
	});
	addEventListener("pagehide", () => {
		saveText.flush();
		saveSettings.flush();
	});
}
