import { describe, expect, it } from "vitest";
import { VENDORS } from "../../lib/privacy/registry";
import { EMAIL_CAPTURE_ENABLED } from "../../tools/teleprompter/lib/interest";
import { vendorSections } from "./privacyPolicyModel";

describe("vendorSections", () => {
	it("lists every vendor in the registry exactly once", () => {
		const names = vendorSections().map((vendor) => vendor.name);
		expect(names.sort()).toEqual(
			Object.values(VENDORS)
				.map((vendor) => vendor.name)
				.sort(),
		);
	});
});

describe("email addresses", () => {
	it("are not collected, as the privacy policy states; update the policy and #13 together before enabling signup", () => {
		expect(EMAIL_CAPTURE_ENABLED).toBe(false);
	});
});
