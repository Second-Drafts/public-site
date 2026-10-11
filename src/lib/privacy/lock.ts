import { CATEGORIES, STORAGE, VENDORS, type Retention } from "./registry.ts";

export type Bump = "patch" | "minor" | "major";

export interface Change {
	bump: Bump;
	summary: string;
}

interface CategoryDisclosure {
	requiresConsent: boolean;
	label: string;
	description: string;
}

interface VendorDisclosure {
	name: string;
	category: string;
	role: string;
	transfer: string;
	privacyUrl: string;
	origins: { scripts: string[]; data: string[] };
}

interface StorageDisclosure {
	setBy: string;
	area: string;
	category: string;
	purposeId: string;
	purpose: string;
	retention: Retention;
}

type PropKinds = Record<string, string[]>;

interface AnalyticsDisclosure {
	events: Record<string, PropKinds>;
	context: PropKinds;
}

export interface AnalyticsSchema {
	events: Record<string, Record<string, { kinds: readonly string[] }>>;
	context: Record<string, { kinds: readonly string[] }>;
}

export interface Snapshot {
	analytics: AnalyticsDisclosure;
	categories: Record<string, CategoryDisclosure>;
	vendors: Record<string, VendorDisclosure>;
	storage: Record<string, StorageDisclosure>;
}

export interface Lock extends Snapshot {
	version: string;
	updated: string;
}

const BUMP_ORDER: Bump[] = ["patch", "minor", "major"];

export function maxBump(...bumps: Bump[]): Bump {
	return bumps.reduce(
		(largest, bump) => (BUMP_ORDER.indexOf(bump) > BUMP_ORDER.indexOf(largest) ? bump : largest),
		"patch",
	);
}

export function bumpVersion(version: string, bump: Bump): string {
	const [major, minor, patch] = version.split(".").map(Number);
	if (bump === "major") return `${major + 1}.0.0`;
	if (bump === "minor") return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

function retentionRank(retention: Retention): number {
	if (retention === "until-tab-closed") return 0;
	if (retention === "until-cleared") return 2;
	return 1;
}

export function compareRetention(a: Retention, b: Retention): number {
	const byKind = retentionRank(a) - retentionRank(b);
	if (byKind !== 0 || typeof a === "string" || typeof b === "string") return byKind;
	return a.months - b.months;
}

function sortedEntries<T>(record: Record<string, T>): [string, T][] {
	return Object.entries(record).sort(([a], [b]) => a.localeCompare(b));
}

function mapRecord<S, T>(source: Record<string, S>, pick: (value: S) => T): Record<string, T> {
	return Object.fromEntries(sortedEntries(source).map(([key, value]) => [key, pick(value)]));
}

function kindsOf(props: Record<string, { kinds: readonly string[] }>): PropKinds {
	return mapRecord(props, ({ kinds }) => [...kinds]);
}

export function buildSnapshot(analytics: AnalyticsSchema): Snapshot {
	return {
		analytics: { events: mapRecord(analytics.events, kindsOf), context: kindsOf(analytics.context) },
		categories: mapRecord(CATEGORIES, ({ requiresConsent, label, description }) => ({
			requiresConsent,
			label,
			description,
		})),
		vendors: mapRecord(VENDORS, ({ name, category, role, transfer, privacyUrl, origins }) => ({
			name,
			category,
			role,
			transfer,
			privacyUrl,
			origins: { scripts: [...origins.scripts], data: [...origins.data] },
		})),
		storage: mapRecord(STORAGE, ({ setBy, area, category, purposeId, purpose, retention }) => ({
			setBy,
			area,
			category,
			purposeId,
			purpose,
			retention,
		})),
	};
}

export function snapshotOf({ analytics, categories, vendors, storage }: Snapshot): Snapshot {
	return { analytics, categories, vendors, storage };
}

function sameValue(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

function describeChange<T>(
	kind: string,
	previous: Record<string, T>,
	next: Record<string, T>,
	rules: {
		added: (value: T) => Bump;
		changed: (before: T, after: T) => Bump;
	},
): Change[] {
	const names = new Set([...Object.keys(previous), ...Object.keys(next)]);
	const changes: Change[] = [];
	for (const name of names) {
		const before = previous[name];
		const after = next[name];
		if (before === undefined) changes.push({ bump: rules.added(after), summary: `${kind} added: ${name}` });
		else if (after === undefined) changes.push({ bump: "minor", summary: `${kind} removed: ${name}` });
		else if (!sameValue(before, after))
			changes.push({ bump: rules.changed(before, after), summary: `${kind} changed: ${name}` });
	}
	return changes;
}

export function diffSnapshots(previous: Snapshot, next: Snapshot): Change[] {
	const requiresConsent = (category: string) => next.categories[category]?.requiresConsent === true;
	const movedInto = (before: string, after: string) => requiresConsent(after) && before !== after;

	return [
		...describeChange("category", previous.categories, next.categories, {
			added: ({ requiresConsent }) => (requiresConsent ? "major" : "minor"),
			changed: (before, after) => (after.requiresConsent && !before.requiresConsent ? "major" : "minor"),
		}),
		...describeChange("vendor", previous.vendors, next.vendors, {
			added: ({ category }) => (requiresConsent(category) ? "major" : "minor"),
			changed: (before, after) => (movedInto(before.category, after.category) ? "major" : "minor"),
		}),
		...describeChange("analytics event", previous.analytics.events, next.analytics.events, {
			added: () => "minor",
			changed: () => "minor",
		}),
		...describeChange("session context property", previous.analytics.context, next.analytics.context, {
			added: () => "minor",
			changed: () => "minor",
		}),
		...describeChange("storage", previous.storage, next.storage, {
			added: ({ category }) => (requiresConsent(category) ? "major" : "minor"),
			changed: (before, after) => {
				const isMajor =
					movedInto(before.category, after.category) ||
					(requiresConsent(after.category) &&
						(before.purposeId !== after.purposeId || compareRetention(after.retention, before.retention) > 0));
				return isMajor ? "major" : "minor";
			},
		}),
	];
}

export function requiredBump(changes: Change[]): Bump {
	return maxBump("patch", ...changes.map(({ bump }) => bump));
}
