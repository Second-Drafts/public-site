export const KEYS = {
	script: "tp:script",
	settings: "tp:settings:v1",
	lastVisit: "tp:lastVisit",
	hintSeen: "tp:hintSeen",
	sessionId: "tp:sessionId",
	visitRecorded: "tp:visitRecorded",
} as const;

type StorageArea = () => Storage;

export const local: StorageArea = () => localStorage;
export const session: StorageArea = () => sessionStorage;

// The storage getter itself throws when storage is blocked, so access stays inside the try.
export function read(key: string, area: StorageArea = local): string | null {
	try {
		return area().getItem(key);
	} catch {
		return null;
	}
}

export function write(key: string, value: string, area: StorageArea = local): void {
	try {
		area().setItem(key, value);
	} catch {
		// blocked or full: the value just won't survive a reload
	}
}

/** Parsed JSON, or undefined when missing or unparsable. Validate the result before trusting it. */
export function readJSON(key: string): unknown {
	const raw = read(key);
	if (raw === null) return undefined;
	try {
		return JSON.parse(raw);
	} catch {
		return undefined;
	}
}

export function writeJSON(key: string, value: unknown): void {
	write(key, JSON.stringify(value));
}
