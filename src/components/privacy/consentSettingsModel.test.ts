import { describe, expect, it } from "vitest";
import { CATEGORIES, VENDORS } from "../../lib/privacy/registry";
import { consentSettingsModel } from "./consentSettingsModel";

describe("consentSettingsModel", () => {
	it("has one entry per category that requires consent, and none for necessary", () => {
		const expected = Object.keys(CATEGORIES).filter((id) => CATEGORIES[id as keyof typeof CATEGORIES].requiresConsent);
		expect(consentSettingsModel().map((category) => category.id)).toEqual(expected);
		expect(consentSettingsModel().map((category) => category.id)).not.toContain("necessary");
	});

	it("carries each category's label and description from the registry", () => {
		const analytics = consentSettingsModel().find((category) => category.id === "analytics");
		expect(analytics?.label).toBe(CATEGORIES.analytics.label);
		expect(analytics?.description).toBe(CATEGORIES.analytics.description);
	});

	it("lists only the vendors in that category", () => {
		const analytics = consentSettingsModel().find((category) => category.id === "analytics");
		expect(analytics?.vendors).toEqual([
			{ name: VENDORS["google-analytics"].name, privacyUrl: VENDORS["google-analytics"].privacyUrl },
		]);
	});
});
