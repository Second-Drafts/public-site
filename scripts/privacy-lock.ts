// Regenerates src/lib/privacy/registry.lock.json from the registry, proposing the version bump the changes require.
// Usage: npm run privacy:lock [-- --bump=minor|major] [-- --accept-concerns]
// A requested bump can raise the proposal, never lower it. Concerns Jev raises block the write until accepted.
import { EVENT_SCHEMA, SESSION_CONTEXT_SCHEMA } from "../src/tools/teleprompter/lib/analytics/events.ts";
import { readFileSync, writeFileSync } from "node:fs";
import {
	bumpVersion,
	buildSnapshot,
	diffSnapshots,
	maxBump,
	requiredBump,
	snapshotOf,
	type Bump,
	type Lock,
	type Snapshot,
} from "../src/lib/privacy/lock.ts";
import { concernsAbout, judgmentsFor } from "../src/lib/privacy/judgments.ts";

const LOCK_PATH = new URL("../src/lib/privacy/registry.lock.json", import.meta.url);
const BUMPS: Bump[] = ["patch", "minor", "major"];

function requestedBump(): Bump {
	const flag = process.argv.find((arg) => arg.startsWith("--bump="));
	if (!flag) return "patch";
	const value = flag.slice("--bump=".length) as Bump;
	if (!BUMPS.includes(value)) throw new Error(`--bump must be one of ${BUMPS.join(", ")}`);
	return value;
}

async function reviewWithJev(previous: Snapshot, next: Snapshot): Promise<boolean> {
	const judgments = judgmentsFor(previous, next);
	if (judgments.length === 0) return true;

	const apiKey = process.env.TYPESAFE_API_KEY;
	if (!apiKey) {
		console.warn("TYPESAFE_API_KEY is not set, so Jev didn't check these. Check them yourself:");
		for (const { subject } of judgments) console.warn(`  - ${subject}`);
		return true;
	}

	const concerns = await concernsAbout(judgments, apiKey);
	if (concerns.length === 0) return true;
	console.warn("Jev thinks these changes may need more than a lock update:");
	for (const { subject, question, probability } of concerns)
		console.warn(`  - ${subject} ${question} (${probability.toFixed(2)})`);
	if (process.argv.includes("--accept-concerns")) return true;
	console.warn("Fix them, or re-run with -- --accept-concerns once you've checked them. The lock was not written.");
	return false;
}

const previous: Lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
const snapshot = buildSnapshot({ events: EVENT_SCHEMA, context: SESSION_CONTEXT_SCHEMA });
const changes = diffSnapshots(snapshotOf(previous), snapshot);

if (changes.length === 0) {
	console.log(`Lock is up to date (version ${previous.version}).`);
	process.exit(0);
}

if (!(await reviewWithJev(snapshotOf(previous), snapshot))) process.exit(1);

const proposed = requiredBump(changes);
const bump = maxBump(proposed, requestedBump());
const version = bumpVersion(previous.version, bump);

for (const { bump, summary } of changes) console.log(`  [${bump}] ${summary}`);
console.log(
	`Proposed ${proposed} bump${bump === proposed ? "" : `, raised to ${bump}`}: ${previous.version} → ${version}`,
);

const lock: Lock = { version, updated: new Date().toISOString().slice(0, 10), ...snapshot };
writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, "\t")}\n`);
console.log("Wrote registry.lock.json. Review the cookie policy before committing.");
