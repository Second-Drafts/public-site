import type { ReceivedHandOff } from "./hand-off";

export const HAND_OFF_HASH_KEY = "s";

// Not URLSearchParams: it would turn the "+" in lz-string's alphabet into a space.
export function findHashParam(hash: string, key: string): string | null {
	const body = hash.startsWith("#") ? hash.slice(1) : hash;
	for (const part of body.split("&")) {
		const eq = part.indexOf("=");
		if (eq > 0 && part.slice(0, eq) === key) return part.slice(eq + 1);
	}
	return null;
}

/**
 * Takes the hand-off out of this page's URL, so a reload doesn't apply it again. Undefined when the URL has none, null
 * when it has one that can't be read, say because it was cut short when copied. The decoder only loads when needed.
 */
export async function takeHandOffFromUrl(): Promise<ReceivedHandOff | null | undefined> {
	if (findHashParam(location.hash, HAND_OFF_HASH_KEY) === null) return undefined;
	const { readHandOff } = await import("./hand-off");
	const handOff = readHandOff(location.hash);
	history.replaceState(null, "", location.pathname + location.search);
	return handOff;
}
