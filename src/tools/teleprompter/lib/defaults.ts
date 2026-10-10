import { DEFAULT_SETTINGS, type Settings } from "./settings";

export function defaultSettingsForViewport(width: number = globalThis.innerWidth ?? 1280): Settings {
	const settings: Settings = { ...DEFAULT_SETTINGS, custom: { ...DEFAULT_SETTINGS.custom } };
	if (width < 600) return { ...settings, fontSize: 36, columnWidth: 90 };
	if (width < 1000) return { ...settings, fontSize: 48, columnWidth: 80 };
	return settings;
}
