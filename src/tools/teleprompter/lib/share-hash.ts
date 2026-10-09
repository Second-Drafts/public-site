/*
 * The share-link hash format, without the decoder, so code that only needs to recognise a share link
 * (analytics, page start-up) doesn't pull lz-string in.
 */

/** Hash key: the link looks like /tools/teleprompter#s=<compressed>. */
export const SHARE_HASH_KEY = "s";

/**
 * Find a param in a hash like "#a=1&s=xyz". Split by hand: URLSearchParams would turn the "+" in
 * lz-string's URI-safe alphabet into a space.
 */
export function findHashParam(hash: string, key: string): string | null {
	const body = hash.startsWith("#") ? hash.slice(1) : hash;
	for (const part of body.split("&")) {
		const eq = part.indexOf("=");
		if (eq > 0 && part.slice(0, eq) === key) return part.slice(eq + 1);
	}
	return null;
}

/** True when the hash carries a share payload (valid or not). */
export const hasShareParam = (hash: string) => findHashParam(hash, SHARE_HASH_KEY) !== null;
