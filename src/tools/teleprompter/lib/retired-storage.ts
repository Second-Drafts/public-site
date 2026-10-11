const RETIRED_LOCAL_KEYS = ["tp:lastVisit"];
const RETIRED_SESSION_KEYS = ["tp:sessionId", "tp:visitRecorded"];

function removeKeys(area: () => Storage, keys: readonly string[]): void {
	try {
		for (const key of keys) area().removeItem(key);
	} catch {}
}

export function removeRetiredStorage(): void {
	removeKeys(() => localStorage, RETIRED_LOCAL_KEYS);
	removeKeys(() => sessionStorage, RETIRED_SESSION_KEYS);
}
