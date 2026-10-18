import { describe, expect, it } from "vitest";
import { STORAGE, VENDORS, describeRetention, findStorageEntry } from "./registry";

const entries = Object.entries(STORAGE);
const vendorSetEntries = entries.filter(([, entry]) => entry.setBy !== "us");
const firstPartyEntries = entries.filter(([, entry]) => entry.setBy === "us");

describe("storage registry", () => {
	it("ties every vendor-set entry to a registered vendor with the same category", () => {
		for (const [name, entry] of vendorSetEntries) {
			const vendor = VENDORS[entry.setBy as keyof typeof VENDORS];
			expect(vendor, name).toBeDefined();
			expect(entry.category, name).toBe(vendor.category);
		}
	});

	it("allows wildcards only in vendor-set names", () => {
		for (const [name] of firstPartyEntries) expect(name).not.toContain("*");
		expect(vendorSetEntries.some(([name]) => name.includes("*"))).toBe(true);
	});

	it("gives each entry its own kebab-case purposeId", () => {
		const ids = entries.map(([, entry]) => entry.purposeId);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("findStorageEntry", () => {
	it("matches an exact name", () => {
		expect(findStorageEntry("local", "tp:script")?.name).toBe("tp:script");
		expect(findStorageEntry("cookie", "_ga")?.name).toBe("_ga");
	});

	it("matches a wildcard suffix but not the bare prefix or a lookalike", () => {
		expect(findStorageEntry("cookie", "_ga_XYZ")?.name).toBe("_ga_*");
		expect(findStorageEntry("cookie", "_ga")?.name).toBe("_ga");
		expect(findStorageEntry("cookie", "_gax")).toBeUndefined();
	});

	it("returns undefined for the wrong area", () => {
		expect(findStorageEntry("session", "tp:script")).toBeUndefined();
		expect(findStorageEntry("local", "_ga")).toBeUndefined();
	});

	it("returns undefined for an unknown name", () => {
		expect(findStorageEntry("local", "mystery")).toBeUndefined();
	});
});

describe("describeRetention", () => {
	it("describes the named variants", () => {
		expect(describeRetention("until-tab-closed")).toBe("Until you close the tab");
		expect(describeRetention("until-cleared")).toBe("Until you clear your browser data");
	});

	it("pluralizes months and converts whole years", () => {
		expect(describeRetention({ months: 1 })).toBe("1 month");
		expect(describeRetention({ months: 13 })).toBe("13 months");
		expect(describeRetention({ months: 12 })).toBe("1 year");
		expect(describeRetention({ months: 24 })).toBe("2 years");
	});
});
