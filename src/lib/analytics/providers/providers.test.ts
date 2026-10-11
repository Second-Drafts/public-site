import { describe, expect, it } from "vitest";
import { VENDORS } from "../../../../../lib/privacy/registry";
import { REGISTRY } from ".";

describe("provider vendors", () => {
	it.each(Object.keys(REGISTRY))("%s names a registered vendor, or none for console", (name) => {
		const { vendor } = REGISTRY[name]({ gaMeasurementId: "G-TEST" });
		if (name === "console") return expect(vendor).toBeNull();
		expect(vendor).not.toBeNull();
		expect(Object.keys(VENDORS)).toContain(vendor);
	});
});
