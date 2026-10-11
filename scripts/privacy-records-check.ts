// Fails while a vendor registered as a processor in a consent category has unticked items in its privacy records.
import { readFileSync } from "node:fs";
import { processorRecordProblems } from "../src/lib/privacy/processor-records.ts";

const readRecord = (file: string) => readFileSync(new URL(`../privacy/${file}`, import.meta.url), "utf8");

const problems = processorRecordProblems(readRecord);

if (problems.length > 0) {
	console.error(problems.join("\n\n"));
	process.exit(1);
}

console.log("Privacy records check passed: every processor's records are ticked.");
