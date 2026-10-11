import {
	CATEGORIES,
	STORAGE,
	VENDORS,
	describeRetention,
	type CategoryId,
	type StorageArea,
	type StorageName,
} from "../../lib/privacy/registry";

export interface CookieTableRow {
	name: string;
	provider: string;
	purpose: string;
	storageType: string;
	retention: string;
}

export interface CookieTableCategory {
	id: CategoryId;
	label: string;
	description: string;
	rows: CookieTableRow[];
}

const FIRST_PARTY_NAME = "Second Drafts";

const STORAGE_TYPES: Record<StorageArea, string> = {
	local: "Local storage",
	session: "Session storage",
	cookie: "Cookie",
};

function displayName(name: string): string {
	return name.endsWith("*") ? `${name.slice(0, -1)}<ID>` : name;
}

function rowFor(name: StorageName): CookieTableRow {
	const entry = STORAGE[name];
	return {
		name: displayName(name),
		provider: entry.setBy === "us" ? FIRST_PARTY_NAME : VENDORS[entry.setBy].name,
		purpose: entry.purpose,
		storageType: STORAGE_TYPES[entry.area],
		retention: describeRetention(entry.retention),
	};
}

export function cookieTableModel(): CookieTableCategory[] {
	const names = Object.keys(STORAGE) as StorageName[];
	return (Object.keys(CATEGORIES) as CategoryId[]).map((id) => ({
		id,
		label: CATEGORIES[id].label,
		description: CATEGORIES[id].description,
		rows: names.filter((name) => STORAGE[name].category === id).map(rowFor),
	}));
}
