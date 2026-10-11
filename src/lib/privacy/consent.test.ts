import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCookieJar, fakeWebStorage } from "./test-fakes";
import lock from "./registry.lock.json";
import { CONSENT_MAX_AGE, type ConsentRecord } from "./consent";

const CONSENT_KEY = "privacy:consent";
const GRANT = { analytics: true };
const DENY = { analytics: false };

function recordFrom(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
	return {
		id: "record-id",
		registryVersion: lock.version,
		choices: GRANT,
		decidedAt: new Date().toISOString(),
		source: "banner",
		...overrides,
	};
}

let local: Storage;
let reload: ReturnType<typeof vi.fn>;
let cookies: ReturnType<typeof fakeCookieJar>;
let otherTabs: EventTarget;

function seedRecord(record: ConsentRecord) {
	local.setItem(CONSENT_KEY, JSON.stringify(record));
}

function storedRecord(): ConsentRecord {
	return JSON.parse(local.getItem(CONSENT_KEY)!);
}

function announceStorageChange(key: string | null = CONSENT_KEY) {
	otherTabs.dispatchEvent(Object.assign(new Event("storage"), { key }));
}

function changeConsentInAnotherTab(record: ConsentRecord) {
	seedRecord(record);
	announceStorageChange();
}

async function loadConsent({ gpc = false } = {}) {
	vi.stubGlobal("navigator", { globalPrivacyControl: gpc });
	vi.resetModules();
	return (await import("./consent")).consent;
}

beforeEach(() => {
	local = fakeWebStorage();
	reload = vi.fn();
	cookies = fakeCookieJar([
		{ name: "_ga", value: "1" },
		{ name: "_ga_ABC123", value: "1" },
		{ name: "unrelated", value: "1" },
	]);
	vi.stubGlobal("localStorage", local);
	vi.stubGlobal("sessionStorage", fakeWebStorage());
	vi.stubGlobal("document", cookies);
	vi.stubGlobal("location", { reload });
	otherTabs = new EventTarget();
	vi.stubGlobal("window", otherTabs);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe("with no record", () => {
	it("denies analytics, allows necessary, and is undecided", async () => {
		const consent = await loadConsent();
		expect(consent.get("necessary")).toBe(true);
		expect(consent.get("analytics")).toBe(false);
		expect(consent.decided()).toBe(false);
	});

	it("treats unparseable stored data as undecided", async () => {
		local.setItem(CONSENT_KEY, "{not json");
		const consent = await loadConsent();
		expect(consent.decided()).toBe(false);
	});
});

describe("set", () => {
	it("remembers an acceptance", async () => {
		const consent = await loadConsent();
		consent.set(GRANT, "banner");
		expect(consent.get("analytics")).toBe(true);
		expect(consent.decided()).toBe(true);
		expect(storedRecord()).toMatchObject({ choices: GRANT, source: "banner", registryVersion: lock.version });
		expect(storedRecord().id).toBeTruthy();
		expect(reload).not.toHaveBeenCalled();
	});

	it("remembers a rejection without reloading", async () => {
		const consent = await loadConsent();
		consent.set(DENY, "banner");
		expect(consent.get("analytics")).toBe(false);
		expect(consent.decided()).toBe(true);
		expect(reload).not.toHaveBeenCalled();
	});
});

describe("expiry", () => {
	it("is undecided once the record is older than the max age", async () => {
		seedRecord(recordFrom({ decidedAt: new Date(Date.now() - CONSENT_MAX_AGE - 1000).toISOString() }));
		const consent = await loadConsent();
		expect(consent.decided()).toBe(false);
		expect(consent.get("analytics")).toBe(false);
	});

	it("is still decided just inside the max age", async () => {
		seedRecord(recordFrom({ decidedAt: new Date(Date.now() - CONSENT_MAX_AGE + 60_000).toISOString() }));
		const consent = await loadConsent();
		expect(consent.decided()).toBe(true);
		expect(consent.get("analytics")).toBe(true);
	});

	it("is undecided when the record predates the current registry major", async () => {
		seedRecord(recordFrom({ registryVersion: "0.9.0" }));
		const consent = await loadConsent();
		expect(consent.decided()).toBe(false);
		expect(consent.get("analytics")).toBe(false);
	});

	it("accepts a record from the same major with a newer minor", async () => {
		seedRecord(recordFrom({ registryVersion: "1.4.2" }));
		const consent = await loadConsent();
		expect(consent.decided()).toBe(true);
	});

	it("purges analytics storage when the record is older than the max age", async () => {
		seedRecord(recordFrom({ decidedAt: new Date(Date.now() - CONSENT_MAX_AGE - 1000).toISOString() }));
		const consent = await loadConsent();
		consent.get("analytics");
		expect(cookies.cookie).toBe("unrelated=1");
	});

	it("purges analytics storage when the record predates the current registry major", async () => {
		seedRecord(recordFrom({ registryVersion: "0.9.0" }));
		const consent = await loadConsent();
		consent.decided();
		expect(cookies.cookie).toBe("unrelated=1");
	});

	it("purges analytics storage when there is no record", async () => {
		const consent = await loadConsent();
		consent.get("analytics");
		expect(cookies.cookie).toBe("unrelated=1");
	});

	it("keeps analytics storage while the record grants it", async () => {
		seedRecord(recordFrom());
		const consent = await loadConsent();
		consent.get("analytics");
		expect(cookies.cookie).toContain("_ga=1");
	});
});

describe("Global Privacy Control", () => {
	it("counts as decided and denied when there is no record", async () => {
		const consent = await loadConsent({ gpc: true });
		expect(consent.decided()).toBe(true);
		expect(consent.get("analytics")).toBe(false);
		expect(local.getItem(CONSENT_KEY)).toBeNull();
	});

	it("is reported as a browser refusal", async () => {
		expect((await loadConsent({ gpc: true })).refusedByBrowser()).toBe(true);
		expect((await loadConsent()).refusedByBrowser()).toBe(false);
	});

	it("overrides a stored grant", async () => {
		seedRecord(recordFrom());
		const consent = await loadConsent({ gpc: true });
		expect(consent.get("analytics")).toBe(false);
		expect(consent.decided()).toBe(true);
	});

	it("purges analytics storage that a stored grant left behind", async () => {
		seedRecord(recordFrom());
		const consent = await loadConsent({ gpc: true });
		consent.get("analytics");
		expect(cookies.cookie).toBe("unrelated=1");
	});

	it("still records a grant chosen in settings without enabling analytics", async () => {
		const consent = await loadConsent({ gpc: true });
		consent.set(GRANT, "settings");
		expect(storedRecord().source).toBe("settings");
		expect(consent.get("analytics")).toBe(false);
		expect(reload).not.toHaveBeenCalled();
	});
});

describe("withdrawal", () => {
	it("purges analytics storage and reloads once", async () => {
		seedRecord(recordFrom());
		const consent = await loadConsent();
		consent.set(DENY, "settings");
		expect(cookies.cookie).toBe("unrelated=1");
		expect(reload).toHaveBeenCalledTimes(1);
		expect(consent.get("analytics")).toBe(false);
	});

	it("keeps the rejection record after purging", async () => {
		seedRecord(recordFrom());
		const consent = await loadConsent();
		consent.set(DENY, "settings");
		expect(storedRecord().choices).toEqual(DENY);
	});
});

describe("onChange", () => {
	it("notifies until unsubscribed", async () => {
		const consent = await loadConsent();
		const listener = vi.fn();
		const unsubscribe = consent.onChange(listener);
		consent.set(GRANT, "banner");
		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();
		consent.set(GRANT, "settings");
		expect(listener).toHaveBeenCalledTimes(1);
	});
});

describe("another tab", () => {
	it("notifies subscribers when the consent record changes", async () => {
		const consent = await loadConsent();
		const listener = vi.fn();
		consent.onChange(listener);
		changeConsentInAnotherTab(recordFrom());
		expect(listener).toHaveBeenCalledTimes(1);
		expect(consent.get("analytics")).toBe(true);
	});

	it("notifies subscribers when storage is cleared", async () => {
		seedRecord(recordFrom());
		const consent = await loadConsent();
		const listener = vi.fn();
		consent.onChange(listener);
		local.clear();
		announceStorageChange(null);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(consent.decided()).toBe(false);
	});

	it("ignores changes to other keys", async () => {
		const consent = await loadConsent();
		const listener = vi.fn();
		consent.onChange(listener);
		announceStorageChange("tp:script");
		expect(listener).not.toHaveBeenCalled();
	});

	it("starts providers waiting on a grant", async () => {
		const consent = await loadConsent();
		const run = vi.fn();
		consent.whenGranted("analytics", run);
		changeConsentInAnotherTab(recordFrom());
		expect(run).toHaveBeenCalledTimes(1);
		expect(reload).not.toHaveBeenCalled();
	});

	it("purges analytics storage and reloads when the other tab withdraws", async () => {
		seedRecord(recordFrom());
		const consent = await loadConsent();
		consent.get("analytics");
		cookies = fakeCookieJar([
			{ name: "_ga", value: "1" },
			{ name: "unrelated", value: "1" },
		]);
		vi.stubGlobal("document", cookies);
		changeConsentInAnotherTab(recordFrom({ choices: DENY }));
		expect(cookies.cookie).toBe("unrelated=1");
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("does not reload when the other tab grants", async () => {
		const consent = await loadConsent();
		consent.get("analytics");
		changeConsentInAnotherTab(recordFrom());
		expect(reload).not.toHaveBeenCalled();
	});
});

describe("record cache", () => {
	it("reads storage once across repeated lookups", async () => {
		seedRecord(recordFrom());
		const consent = await loadConsent();
		const getItem = vi.spyOn(local, "getItem");
		consent.get("analytics");
		consent.decided();
		consent.get("analytics");
		expect(getItem).toHaveBeenCalledTimes(1);
	});

	it("is refreshed by set", async () => {
		const consent = await loadConsent();
		expect(consent.get("analytics")).toBe(false);
		consent.set(GRANT, "banner");
		expect(consent.get("analytics")).toBe(true);
	});

	it("is refreshed by a storage event", async () => {
		const consent = await loadConsent();
		expect(consent.get("analytics")).toBe(false);
		changeConsentInAnotherTab(recordFrom());
		expect(consent.get("analytics")).toBe(true);
	});

	it("goes stale without a storage event", async () => {
		const consent = await loadConsent();
		expect(consent.get("analytics")).toBe(false);
		seedRecord(recordFrom());
		expect(consent.get("analytics")).toBe(false);
	});
});

describe("whenGranted", () => {
	it("runs immediately when already granted", async () => {
		const consent = await loadConsent();
		consent.set(GRANT, "banner");
		const run = vi.fn();
		consent.whenGranted("analytics", run);
		expect(run).toHaveBeenCalledTimes(1);
	});

	it("runs exactly once when granted later", async () => {
		const consent = await loadConsent();
		const run = vi.fn();
		consent.whenGranted("analytics", run);
		expect(run).not.toHaveBeenCalled();
		consent.set(DENY, "banner");
		expect(run).not.toHaveBeenCalled();
		consent.set(GRANT, "settings");
		expect(run).toHaveBeenCalledTimes(1);
		consent.set(GRANT, "settings");
		expect(run).toHaveBeenCalledTimes(1);
	});

	it("runs necessary callbacks immediately", async () => {
		const consent = await loadConsent();
		const run = vi.fn();
		consent.whenGranted("necessary", run);
		expect(run).toHaveBeenCalledTimes(1);
	});
});
