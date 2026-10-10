export const SHARE_HASH_KEY = "s";

// Not URLSearchParams: it would turn the "+" in lz-string's alphabet into a space.
export function findHashParam(hash: string, key: string): string | null {
	const body = hash.startsWith("#") ? hash.slice(1) : hash;
	for (const part of body.split("&")) {
		const eq = part.indexOf("=");
		if (eq > 0 && part.slice(0, eq) === key) return part.slice(eq + 1);
	}
	return null;
}

export const hasShareParam = (hash: string) => findHashParam(hash, SHARE_HASH_KEY) !== null;
