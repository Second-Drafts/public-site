import { CATEGORIES, type CategoryId } from "./registry";

export const consent = {
	get(category: CategoryId): boolean {
		return !CATEGORIES[category].requiresConsent;
	},
};
