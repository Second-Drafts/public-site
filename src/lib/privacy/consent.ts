import { CATEGORIES, CONSENT_CATEGORY_IDS, type CategoryId, type ConsentCategoryId } from "./registry";
import { version as REGISTRY_VERSION } from "./registry.lock.json";
import { purgeCategory, rawStored } from "./raw-storage";

const CONSENT_KEY = "privacy:consent";

export const CONSENT_MAX_AGE = 6 * 30 * 24 * 60 * 60 * 1000;

export type ConsentSource = "banner" | "settings";
export type ConsentChoices = Record<ConsentCategoryId, boolean>;

export interface ConsentRecord {
	id: string;
	registryVersion: string;
	choices: ConsentChoices;
	decidedAt: string;
	source: ConsentSource;
}

declare global {
	interface Navigator {
		globalPrivacyControl?: boolean;
	}
}

export function buildChoices(choiceFor: (category: ConsentCategoryId) => boolean): ConsentChoices {
	return Object.fromEntries(CONSENT_CATEGORY_IDS.map((id) => [id, choiceFor(id)])) as ConsentChoices;
}

const listeners = new Set<() => void>();

function majorVersion(version: string): number {
	return Number(version.split(".")[0]);
}

function isConsentRecord(value: unknown): value is ConsentRecord {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Partial<ConsentRecord>;
	return (
		typeof record.id === "string" &&
		typeof record.registryVersion === "string" &&
		typeof record.decidedAt === "string" &&
		typeof record.choices === "object" &&
		record.choices !== null
	);
}

function isCurrent(record: ConsentRecord): boolean {
	const age = Date.now() - Date.parse(record.decidedAt);
	const isFresh = age >= 0 && age < CONSENT_MAX_AGE;
	return isFresh && majorVersion(record.registryVersion) >= majorVersion(REGISTRY_VERSION);
}

function readStoredRecord(): ConsentRecord | undefined {
	const record = rawStored(CONSENT_KEY).readJSON();
	return isConsentRecord(record) ? record : undefined;
}

let storedRecord: ConsentRecord | undefined;
let isTrackingStorage = false;

function ensureTrackingStorage(): void {
	if (isTrackingStorage) return;
	isTrackingStorage = true;
	storedRecord = readStoredRecord();
	window.addEventListener("storage", handleStorageEvent);
	purgeUngrantedCategories();
}

function currentRecord(): ConsentRecord | undefined {
	ensureTrackingStorage();
	return storedRecord && isCurrent(storedRecord) ? storedRecord : undefined;
}

function gpcOptedOut(): boolean {
	return navigator.globalPrivacyControl === true;
}

function isGranted(category: CategoryId): boolean {
	if (!CATEGORIES[category].requiresConsent) return true;
	const record = currentRecord();
	return !gpcOptedOut() && record?.choices[category as ConsentCategoryId] === true;
}

function purgeUngrantedCategories(): void {
	CONSENT_CATEGORY_IDS.filter((category) => !isGranted(category)).forEach(purgeCategory);
}

function replaceStoredRecord(record: ConsentRecord | undefined): void {
	const previouslyGranted = CONSENT_CATEGORY_IDS.filter(isGranted);
	storedRecord = record;
	listeners.forEach((listener) => listener());
	purgeUngrantedCategories();
	if (previouslyGranted.some((category) => !isGranted(category))) location.reload();
}

function handleStorageEvent(event: StorageEvent): void {
	if (event.key !== null && event.key !== CONSENT_KEY) return;
	replaceStoredRecord(readStoredRecord());
}

export const consent = {
	get: isGranted,

	refusedByBrowser: gpcOptedOut,

	decided(): boolean {
		return currentRecord() !== undefined || gpcOptedOut();
	},

	set(choices: ConsentChoices, source: ConsentSource): void {
		const record: ConsentRecord = {
			id: crypto.randomUUID(),
			registryVersion: REGISTRY_VERSION,
			choices,
			decidedAt: new Date().toISOString(),
			source,
		};
		ensureTrackingStorage();
		rawStored(CONSENT_KEY).writeJSON(record);
		replaceStoredRecord(record);
	},

	onChange(listener: () => void): () => void {
		ensureTrackingStorage();
		listeners.add(listener);
		return () => listeners.delete(listener);
	},

	whenGranted(category: CategoryId, run: () => void): void {
		if (isGranted(category)) return run();
		const stopListening = consent.onChange(() => {
			if (!isGranted(category)) return;
			stopListening();
			run();
		});
	},
};
