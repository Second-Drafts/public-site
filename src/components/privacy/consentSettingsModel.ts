import { CATEGORIES, VENDORS, type ConsentCategoryId } from "../../lib/privacy/registry";

export interface ConsentSettingsCategory {
	id: ConsentCategoryId;
	label: string;
	description: string;
	vendors: { name: string; privacyUrl: string }[];
}

function isConsentCategory(id: string): id is ConsentCategoryId {
	return id in CATEGORIES && CATEGORIES[id as ConsentCategoryId].requiresConsent;
}

export function consentSettingsModel(): ConsentSettingsCategory[] {
	return Object.keys(CATEGORIES)
		.filter(isConsentCategory)
		.map((id) => ({
			id,
			label: CATEGORIES[id].label,
			description: CATEGORIES[id].description,
			vendors: Object.values(VENDORS)
				.filter((vendor) => vendor.category === id)
				.map(({ name, privacyUrl }) => ({ name, privacyUrl })),
		}));
}
