import { describe, expect, it } from "vitest";
import { CATEGORIES, STORAGE } from "../../lib/privacy/registry";
import { cookieTableModel } from "./cookieTableModel";

const rows = () => cookieTableModel().flatMap((category) => category.rows);

describe("cookieTableModel", () => {
	it("has one group per category, in registry order", () => {
		expect(cookieTableModel().map((category) => category.id)).toEqual(Object.keys(CATEGORIES));
	});

	it("lists every storage entry exactly once", () => {
		expect(rows()).toHaveLength(Object.keys(STORAGE).length);
	});

	it("attributes first-party keys to us and vendor keys to the vendor", () => {
		const byName = Object.fromEntries(rows().map((row) => [row.name, row]));
		expect(byName["tp:script"]).toMatchObject({ provider: "Second Drafts", storageType: "Local storage" });
		expect(byName["_ga"]).toMatchObject({ provider: "Google Analytics", storageType: "Cookie", retention: "2 years" });
	});

	it("shows a wildcard name as a placeholder", () => {
		expect(rows().map((row) => row.name)).toContain("_ga_<ID>");
		expect(rows().map((row) => row.name)).not.toContain("_ga_*");
	});

	it("groups rows under the category they belong to", () => {
		const analytics = cookieTableModel().find((category) => category.id === "analytics");
		expect(analytics?.rows.map((row) => row.name)).toEqual(["_ga", "_ga_<ID>"]);
	});

	it("never mentions the Universal Analytics _gid cookie", () => {
		expect(JSON.stringify(cookieTableModel())).not.toContain("_gid");
	});
});
