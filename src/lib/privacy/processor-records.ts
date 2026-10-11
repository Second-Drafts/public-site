// The lock lets a processor join or swap within a consent category without asking visitors again, so a vendor
// registered as a processor must have the account work that makes it one recorded as done in privacy/.
import { CATEGORIES, VENDORS, type VendorId } from "./registry.ts";

interface ProcessorRecord {
	file: string;
	// Each must start a ticked checklist line, `- [x] <item>`, in `file`.
	items: readonly string[];
}

export const PROCESSOR_RECORDS: Partial<Record<VendorId, ProcessorRecord>> = {
	"google-analytics": {
		file: "google-analytics.md",
		items: [
			"Accept Google's data processing terms",
			"Data sharing settings",
			"Requests to `https://www.google.com` checked",
		],
	},
};

const TICKED_LINE = /^- \[[xX]\] (.*)$/;

export function untickedItems(markdown: string, items: readonly string[]): string[] {
	const tickedLines = markdown.split("\n").flatMap((line) => line.match(TICKED_LINE)?.slice(1) ?? []);
	return items.filter((item) => !tickedLines.some((line) => line.startsWith(item)));
}

export function consentedProcessorIds(): VendorId[] {
	return (Object.keys(VENDORS) as VendorId[]).filter((id) => {
		const vendor = VENDORS[id];
		return vendor.role === "processor" && CATEGORIES[vendor.category].requiresConsent;
	});
}

export function processorRecordProblems(readRecord: (file: string) => string): string[] {
	return consentedProcessorIds().flatMap((id) => {
		const { name } = VENDORS[id];
		const record = PROCESSOR_RECORDS[id];
		if (!record) {
			return [
				`${name} is registered as a processor in a consent category, but PROCESSOR_RECORDS in src/lib/privacy/processor-records.ts lists no checklist items for it.`,
			];
		}

		const unticked = untickedItems(readRecord(record.file), record.items);
		if (unticked.length === 0) return [];
		return [
			[
				`${name} is registered as a processor, but these are not ticked in privacy/${record.file}:`,
				...unticked.map((item) => `  - [ ] ${item}`),
				"Tick them once done in the vendor's account, or register the vendor as a controller and run npm run privacy:lock.",
			].join("\n"),
		];
	});
}
