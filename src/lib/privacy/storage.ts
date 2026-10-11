import { consent } from "./consent";
import { rawStored } from "./raw-storage";
import { reportViolation } from "./violation";
import { STORAGE, type FirstPartyKey } from "./registry";

function isPermitted(key: FirstPartyKey): boolean {
	const { category } = STORAGE[key];
	if (consent.get(category)) return true;
	reportViolation(`${key} (${category}) skipped: consent not granted`);
	return false;
}

export function stored(key: FirstPartyKey) {
	const raw = rawStored(key);

	function read(): string | null {
		return isPermitted(key) ? raw.read() : null;
	}

	function readJSON(): unknown {
		return isPermitted(key) ? raw.readJSON() : undefined;
	}

	function write(value: string): void {
		if (isPermitted(key)) raw.write(value);
	}

	function writeJSON(value: unknown): void {
		if (isPermitted(key)) raw.writeJSON(value);
	}

	return { read, readJSON, write, writeJSON, remove: raw.remove };
}
