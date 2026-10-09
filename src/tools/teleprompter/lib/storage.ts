/*
 * localStorage, wrapped so the tool keeps working when storage is blocked or full (private browsing,
 * strict privacy settings). Every read and write is in try/catch; failures are silent.
 */

export const KEYS = {
	script: "tp:script",
	settings: "tp:settings:v1",
	lastVisit: "tp:lastVisit",
	hintSeen: "tp:hintSeen",
} as const;

export function read(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

/** Returns false if the write failed. */
export function write(key: string, value: string): boolean {
	try {
		localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
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

export function writeJSON(key: string, value: unknown): boolean {
	return write(key, JSON.stringify(value));
}

/** Trailing-edge debounce with a flush, so a pending save can be written on pagehide. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let pending: A | undefined;
	const run = () => {
		timer = undefined;
		if (pending) {
			const args = pending;
			pending = undefined;
			fn(...args);
		}
	};
	const debounced = (...args: A) => {
		pending = args;
		clearTimeout(timer);
		timer = setTimeout(run, ms);
	};
	debounced.flush = () => {
		clearTimeout(timer);
		run();
	};
	return debounced;
}
