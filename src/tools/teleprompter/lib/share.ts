import { handOffUrl, readHandOff, type HandOffOrigin, type ReceivedHandOff } from "../../../lib/hand-off";
import { asRecord } from "../../../lib/validate";
import { DEFAULT_SETTINGS, validateSettings, type Settings } from "./settings";

/** Without `settings` the link carries the script only, and opening it keeps the visitor's own settings. */
export interface SharePayload {
	script: string;
	settings?: Settings;
	origin?: HandOffOrigin;
}

export const SHARE_URL_WARN_LENGTH = 8000;

export function buildShareUrl(base: string, payload: SharePayload): { url: string; tooLong: boolean } {
	const fields = payload.settings ? { s: diffFromDefaults(validateSettings(payload.settings)) } : {};
	const url = handOffUrl(base, { text: payload.script, origin: payload.origin }, fields);
	return { url, tooLong: url.length > SHARE_URL_WARN_LENGTH };
}

export function decodeShareHash(hash: string): SharePayload | null {
	const handOff = readHandOff(hash);
	return handOff && sharedScript(handOff);
}

export function sharedScript(handOff: ReceivedHandOff): SharePayload {
	const { s } = handOff.fields;
	return {
		script: handOff.text,
		...(s !== undefined && { settings: validateSettings(mergeOverDefaults(s)) }),
		...(handOff.origin && { origin: handOff.origin }),
	};
}

function diffFromDefaults(settings: Settings): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
		if (key === "custom") {
			const custom: Record<string, string> = {};
			for (const c of Object.keys(DEFAULT_SETTINGS.custom) as (keyof Settings["custom"])[]) {
				if (settings.custom[c] !== DEFAULT_SETTINGS.custom[c]) custom[c] = settings.custom[c];
			}
			if (Object.keys(custom).length > 0) out.custom = custom;
		} else if (settings[key] !== DEFAULT_SETTINGS[key]) {
			out[key] = settings[key];
		}
	}
	return out;
}

function mergeOverDefaults(partial: unknown): Record<string, unknown> {
	const p = asRecord(partial);
	return { ...DEFAULT_SETTINGS, ...p, custom: { ...DEFAULT_SETTINGS.custom, ...asRecord(p.custom) } };
}
