import { CATEGORIES, CONSENT_CATEGORY_IDS, VENDORS, type ConsentCategoryId } from "../../lib/privacy/registry";

export interface ConsentSettingsCategory {
	id: ConsentCategoryId;
	label: string;
	description: string;
	vendors: { name: string; privacyUrl: string }[];
}

export function consentSettingsModel(): ConsentSettingsCategory[] {
	return CONSENT_CATEGORY_IDS.map((id) => ({
		id,
		label: CATEGORIES[id].label,
		description: CATEGORIES[id].description,
		vendors: Object.values(VENDORS)
			.filter((vendor) => vendor.category === id)
			.map(({ name, privacyUrl }) => ({ name, privacyUrl })),
	}));
}
