import { CATEGORIES, VENDORS } from "../../lib/privacy/registry";

export interface VendorSection {
	name: string;
	category: string;
	roleDescription: string;
	transfer: string;
	privacyUrl: string;
}

const ROLE_DESCRIPTIONS = {
	processor: "Handles data on our behalf, under our instructions.",
	controller: "Decides for its own purposes how it uses the data it receives.",
} as const;

export function vendorSections(): VendorSection[] {
	return Object.values(VENDORS).map(({ name, category, role, transfer, privacyUrl }) => ({
		name,
		category: CATEGORIES[category].label,
		roleDescription: ROLE_DESCRIPTIONS[role],
		transfer,
		privacyUrl,
	}));
}
