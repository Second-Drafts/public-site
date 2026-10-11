import { consent } from "./consent";
import { findStorageEntry, STORAGE, type CategoryId, type FirstPartyKey, type StorageArea } from "./registry";

const COOKIE_DOMAIN = ".seconddrafts.com";

type WebStorageArea = Exclude<StorageArea, "cookie">;

const webStorage: Record<WebStorageArea, () => Storage> = {
	local: () => localStorage,
	session: () => sessionStorage,
};

function isPermitted(key: FirstPartyKey): boolean {
	const { category } = STORAGE[key];
	if (consent.get(category)) return true;
	if (import.meta.env.DEV) console.warn(`[privacy] ${key} (${category}) skipped: consent not granted`);
	return false;
}

// The storage getter itself throws when storage is blocked, so access stays inside the try.
export function stored(key: FirstPartyKey) {
	const area = () => webStorage[STORAGE[key].area]();

	function read(): string | null {
		if (!isPermitted(key)) return null;
		try {
			return area().getItem(key);
		} catch {
			return null;
		}
	}

	function readJSON(): unknown {
		const raw = read();
		if (raw === null) return undefined;
		try {
			return JSON.parse(raw);
		} catch {
			return undefined;
		}
	}

	function write(value: string): void {
		if (!isPermitted(key)) return;
		try {
			area().setItem(key, value);
		} catch {}
	}

	function writeJSON(value: unknown): void {
		write(JSON.stringify(value));
	}

	function remove(): void {
		try {
			area().removeItem(key);
		} catch {}
	}

	return { read, readJSON, write, writeJSON, remove };
}

function presentNames(area: WebStorageArea): string[] {
	const storage = webStorage[area]();
	return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
		(name): name is string => name !== null,
	);
}

function purgeWebStorage(area: WebStorageArea, category: CategoryId): void {
	try {
		const storage = webStorage[area]();
		for (const name of presentNames(area)) {
			if (findStorageEntry(area, name)?.category === category) storage.removeItem(name);
		}
	} catch {}
}

function presentCookieNames(): string[] {
	return document.cookie
		.split(";")
		.map((pair) => pair.split("=")[0].trim())
		.filter((name) => name !== "");
}

function expireCookie(name: string): void {
	const expired = `${name}=; Max-Age=0; path=/`;
	document.cookie = expired;
	document.cookie = `${expired}; domain=${COOKIE_DOMAIN}`;
}

function purgeCookies(category: CategoryId): void {
	try {
		for (const name of presentCookieNames()) {
			if (findStorageEntry("cookie", name)?.category === category) expireCookie(name);
		}
	} catch {}
}

export function purgeCategory(category: CategoryId): void {
	purgeWebStorage("local", category);
	purgeWebStorage("session", category);
	purgeCookies(category);
}
