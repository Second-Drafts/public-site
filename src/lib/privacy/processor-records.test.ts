import { describe, expect, it } from "vitest";
import { PROCESSOR_RECORDS, consentedProcessorIds, processorRecordProblems, untickedItems } from "./processor-records";

const ITEMS = ["Accept the terms", "Data sharing settings"];

describe("untickedItems", () => {
	it("returns nothing when every item starts a ticked line", () => {
		const markdown = "# Setup\n\n- [x] Accept the terms (Admin > Terms)\n- [X] Data sharing settings all off\n";
		expect(untickedItems(markdown, ITEMS)).toEqual([]);
	});

	it("returns items whose line is unticked", () => {
		const markdown = "- [x] Accept the terms\n- [ ] Data sharing settings all off\n";
		expect(untickedItems(markdown, ITEMS)).toEqual(["Data sharing settings"]);
	});

	it("returns items with no checklist line at all", () => {
		expect(untickedItems("- [x] Accept the terms\n", ITEMS)).toEqual(["Data sharing settings"]);
	});

	it("ignores ticked lines that only mention the item later on", () => {
		const markdown = "- [x] Accept the terms\n- [x] Check the Data sharing settings page\n";
		expect(untickedItems(markdown, ITEMS)).toEqual(["Data sharing settings"]);
	});

	it("ignores the item text outside a checklist line", () => {
		const markdown = "Accept the terms\nData sharing settings\n";
		expect(untickedItems(markdown, ITEMS)).toEqual(ITEMS);
	});
});

describe("processorRecordProblems", () => {
	const processorIds = consentedProcessorIds();

	it("lists checklist items for every processor in a consent category", () => {
		for (const id of processorIds) expect(PROCESSOR_RECORDS[id], id).toBeDefined();
	});

	it("passes when every required item is ticked", () => {
		const everyItemTicked = processorIds
			.flatMap((id) => PROCESSOR_RECORDS[id]?.items ?? [])
			.map((item) => `- [x] ${item}`)
			.join("\n");
		expect(processorRecordProblems(() => everyItemTicked)).toEqual([]);
	});

	it("names the vendor, file and each unticked item", () => {
		const problems = processorRecordProblems(() => "- [ ] Accept Google's data processing terms\n");
		expect(problems).toHaveLength(processorIds.length);
		expect(problems[0]).toContain("Google Analytics");
		expect(problems[0]).toContain("privacy/google-analytics.md");
		expect(problems[0]).toContain("- [ ] Data sharing settings");
	});
});
