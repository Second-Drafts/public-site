import { CATEGORIES, type CategoryId, type ConsentCategoryId } from "./registry";
import { purgeCategory, stored } from "./storage";

export const CONSENT_MAX_AGE = 6 * 30 * 24 * 60 * 60 * 1000;

const REGISTRY_VERSION = "1";

export type ConsentSource = "banner" | "settings" | "gpc";
export type ConsentChoices = Record<ConsentCategoryId, boolean>;

export interface ConsentRecord {
	id: string;
	registryVersion: string;
	choices: ConsentChoices;
	decidedAt: string;
	source: ConsentSource;
}

const consentCategoryIds = (Object.keys(CATEGORIES) as CategoryId[]).filter(
	(id): id is ConsentCategoryId => CATEGORIES[id].requiresConsent,
);

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

function currentRecord(): ConsentRecord | undefined {
	const record = stored("privacy:consent").readJSON();
	return isConsentRecord(record) && isCurrent(record) ? record : undefined;
}

function recordConsent(record: ConsentRecord): void {
	stored("privacy:consent").writeJSON(record);
}

function gpcOptedOut(): boolean {
	return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

function isGranted(category: CategoryId): boolean {
	if (!CATEGORIES[category].requiresConsent) return true;
	return currentRecord()?.choices[category as ConsentCategoryId] === true;
}

function withdrawnSince(previouslyGranted: ConsentCategoryId[]): ConsentCategoryId[] {
	return previouslyGranted.filter((category) => !isGranted(category));
}

export const consent = {
	get: isGranted,

	decided(): boolean {
		return currentRecord() !== undefined || gpcOptedOut();
	},

	set(choices: ConsentChoices, source: ConsentSource): void {
		const previouslyGranted = consentCategoryIds.filter(isGranted);
		recordConsent({
			id: crypto.randomUUID(),
			registryVersion: REGISTRY_VERSION,
			choices,
			decidedAt: new Date().toISOString(),
			source,
		});
		listeners.forEach((listener) => listener());

		const withdrawn = withdrawnSince(previouslyGranted);
		if (withdrawn.length === 0) return;
		withdrawn.forEach(purgeCategory);
		location.reload();
	},

	onChange(listener: () => void): () => void {
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
