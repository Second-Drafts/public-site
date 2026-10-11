import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VENDORS } from "./registry";

const RECORD_FILES = ["vendors.md", "google-analytics.md", "processing-record.md"];
const LAST_REVIEWED = /^Last reviewed: (\d{4}-\d{2}-\d{2})$/m;

function readRecord(file: string): string {
	return readFileSync(new URL(`../../../privacy/${file}`, import.meta.url), "utf8");
}

function sectionFor(markdown: string, heading: string): string | undefined {
	return markdown.split(/^## /m).find((section) => section.startsWith(`${heading}\n`));
}

describe("vendors.md", () => {
	const vendorsFile = readRecord("vendors.md");

	for (const vendor of Object.values(VENDORS)) {
		it(`has a section for ${vendor.name} that matches the registry`, () => {
			const section = sectionFor(vendorsFile, vendor.name);
			expect(section, `add "## ${vendor.name}" to privacy/vendors.md`).toBeDefined();
			expect(section).toContain(`**Role:** ${vendor.role}`);
			expect(section).toContain(vendor.transfer);
			expect(section).toContain(vendor.privacyUrl);
		});
	}
});

describe("processing-record.md", () => {
	it("mentions every vendor", () => {
		const record = readRecord("processing-record.md");
		for (const vendor of Object.values(VENDORS)) expect(record).toContain(vendor.name);
	});
});

describe.each(RECORD_FILES)("%s", (file) => {
	it("has a valid last reviewed date that is not in the future", () => {
		const match = readRecord(file).match(LAST_REVIEWED);
		expect(match, "add a 'Last reviewed: YYYY-MM-DD' line").not.toBeNull();
		const reviewed = new Date(`${match![1]}T00:00:00Z`);
		expect(Number.isNaN(reviewed.getTime())).toBe(false);
		expect(reviewed.getTime()).toBeLessThanOrEqual(Date.now());
	});
});
