/*
 * Share links with no backend. The script and settings are compressed with lz-string into the URL
 * hash (#s=…). Browsers never send the hash to a server, so the script stays on the reader's device.
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { DEFAULT_SETTINGS, validateSettings, type Settings } from "./settings";
import { findHashParam, SHARE_HASH_KEY } from "./share-hash";

export { SHARE_HASH_KEY };

export interface SharePayload {
	script: string;
	settings: Settings;
}

/** Above this many characters, some apps may truncate the link. We still let people copy it. */
export const SHARE_URL_WARN_LENGTH = 8000;


/** Payload format version. Bump when the JSON shape changes. */
const PAYLOAD_VERSION = 1;

/** Decoded scripts are cut to this many characters so a hostile link can't hand the page a huge string. */
export const MAX_SHARED_SCRIPT_LENGTH = 200_000;

/*
 * Wire format: JSON `{ v: 1, t: script, s: settings }`, compressed with lz-string.
 * To keep links short, `s` holds only the settings that differ from DEFAULT_SETTINGS (and inside
 * `custom`, only the colours that differ). On decode the partial object is merged over the defaults
 * and run through validateSettings, so links stay valid if defaults change in a later version.
 *
 * Safety: settings from a link always pass through validateSettings, so a hostile link cannot inject
 * out-of-range numbers, unknown theme ids or CSS through a colour. The script is plain text; the
 * renderers must use textContent (never innerHTML) when showing it.
 */

/** `base` is the page URL without a hash. */
export function buildShareUrl(base: string, payload: SharePayload): { url: string; tooLong: boolean } {
	const body = { v: PAYLOAD_VERSION, t: payload.script, s: diffFromDefaults(validateSettings(payload.settings)) };
	const url = `${base}#${SHARE_HASH_KEY}=${compressToEncodedURIComponent(JSON.stringify(body))}`;
	return { url, tooLong: url.length > SHARE_URL_WARN_LENGTH };
}

/** Accepts location.hash ("#s=…") or the bare value. Returns null for anything that isn't a valid share. */
export function decodeShareHash(hash: string): SharePayload | null {
	try {
		const encoded = findHashParam(hash, SHARE_HASH_KEY);
		if (!encoded) return null;

		const json = decompressFromEncodedURIComponent(encoded);
		if (!json) return null;

		const data: unknown = JSON.parse(json);
		if (typeof data !== "object" || data === null || Array.isArray(data)) return null;
		const { v, t, s } = data as Record<string, unknown>;
		if (v !== PAYLOAD_VERSION || typeof t !== "string") return null;

		return { script: capScript(t), settings: validateSettings(mergeOverDefaults(s)) };
	} catch {
		return null;
	}
}


function capScript(text: string): string {
	if (text.length <= MAX_SHARED_SCRIPT_LENGTH) return text;
	let cut = text.slice(0, MAX_SHARED_SCRIPT_LENGTH);
	// Don't leave half of a surrogate pair at the end.
	const last = cut.charCodeAt(cut.length - 1);
	if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
	return cut;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Only the settings (and custom colours) that differ from the defaults. */
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

/** Overlay a (possibly hostile) partial settings object on the defaults. validateSettings does the checking. */
function mergeOverDefaults(partial: unknown): Record<string, unknown> {
	const p = isRecord(partial) ? partial : {};
	return { ...DEFAULT_SETTINGS, ...p, custom: { ...DEFAULT_SETTINGS.custom, ...(isRecord(p.custom) ? p.custom : {}) } };
}
