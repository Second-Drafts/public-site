import { describe, expect, it } from "vitest";
import { VENDORS } from "../../lib/privacy/registry";
import { EVENT_SCHEMA, SESSION_CONTEXT_SCHEMA } from "../../lib/analytics/events";
import { analyticsEvents, sessionContextProperties, vendorSections } from "./privacyPolicyModel";

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

describe("analytics disclosure", () => {
	it("lists every event and property the code can send", () => {
		const expected = Object.entries(EVENT_SCHEMA).map(([name, props]) => ({
			name,
			properties: Object.keys(props).sort(),
		}));
		expect(analyticsEvents()).toEqual(expect.arrayContaining(expected));
		expect(analyticsEvents()).toHaveLength(expected.length);
	});

	it("lists the session context properties", () => {
		expect(sessionContextProperties()).toEqual(Object.keys(SESSION_CONTEXT_SCHEMA).sort());
	});
});
