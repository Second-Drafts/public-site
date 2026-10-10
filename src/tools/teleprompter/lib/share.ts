import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { DEFAULT_SETTINGS, validateSettings, type Settings } from "./settings";
import { isRecord } from "./object";
import { findHashParam, SHARE_HASH_KEY } from "./share-hash";

export { SHARE_HASH_KEY };

export interface SharePayload {
	script: string;
	settings: Settings;
}

export const SHARE_URL_WARN_LENGTH = 8000;

const PAYLOAD_VERSION = 1;

export const MAX_SHARED_SCRIPT_LENGTH = 200_000;

export function buildShareUrl(base: string, payload: SharePayload): { url: string; tooLong: boolean } {
	const body = { v: PAYLOAD_VERSION, t: payload.script, s: diffFromDefaults(validateSettings(payload.settings)) };
	const url = `${base}#${SHARE_HASH_KEY}=${compressToEncodedURIComponent(JSON.stringify(body))}`;
	return { url, tooLong: url.length > SHARE_URL_WARN_LENGTH };
}

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
	const p = isRecord(partial) ? partial : {};
	return { ...DEFAULT_SETTINGS, ...p, custom: { ...DEFAULT_SETTINGS.custom, ...(isRecord(p.custom) ? p.custom : {}) } };
}
