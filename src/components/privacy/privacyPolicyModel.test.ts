import { describe, expect, it } from "vitest";
import { VENDORS } from "../../lib/privacy/registry";
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
