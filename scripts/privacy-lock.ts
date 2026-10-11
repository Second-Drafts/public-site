// Regenerates src/lib/privacy/registry.lock.json from the registry, proposing the version bump the changes require.
// Usage: npm run privacy:lock [-- --bump=minor|major] [-- --confirm=<code>]
// A requested bump can raise the proposal, never lower it. Anything a person must check blocks the write until
// they re-run with the code printed for that exact list, and the lock records how each change was reviewed.
import { EVENT_SCHEMA, SESSION_CONTEXT_SCHEMA } from "../src/lib/analytics/events.ts";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
	bumpVersion,
	buildSnapshot,
	diffSnapshots,
	maxBump,
	requiredBump,
	snapshotOf,
	type Bump,
	type Lock,
} from "../src/lib/privacy/lock.ts";
import { reviewChanges, type ReviewItem } from "../src/lib/privacy/judgments.ts";

const LOCK_PATH = new URL("../src/lib/privacy/registry.lock.json", import.meta.url);
const ENV_PATH = new URL("../.env", import.meta.url);
const ENV_READ_ATTEMPTS = 5;
const BUMPS: Bump[] = ["patch", "minor", "major"];

function flagValue(name: string): string | undefined {
	const prefix = `--${name}=`;
	return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function requestedBump(): Bump {
	const value = (flagValue("bump") ?? "patch") as Bump;
	if (!BUMPS.includes(value)) throw new Error(`--bump must be one of ${BUMPS.join(", ")}`);
	return value;
}

// .env is a 1Password-mounted pipe, and a read of it sometimes comes back empty, so read it until the key appears.
async function typesafeApiKey(): Promise<string | undefined> {
	for (let attempt = 0; attempt < ENV_READ_ATTEMPTS && !process.env.TYPESAFE_API_KEY; attempt++) {
		if (!existsSync(ENV_PATH)) break;
		process.loadEnvFile(ENV_PATH);
		if (!process.env.TYPESAFE_API_KEY) await new Promise((resolve) => setTimeout(resolve, 100));
	}
	return process.env.TYPESAFE_API_KEY;
}

function confirmationCode(items: ReviewItem[]): string {
	const listed = items.map(({ subject, outcome }) => `${subject}\t${outcome}`).join("\n");
	return createHash("sha256").update(listed).digest("hex").slice(0, 8);
}

function confirmedByPerson(reviews: ReviewItem[]): boolean {
	const forPerson = reviews.filter(({ toCheck }) => toCheck.length > 0);
	if (forPerson.length === 0) return true;
	const code = confirmationCode(forPerson);
	if (flagValue("confirm") === code) return true;

	console.warn("A person needs to check these before the lock is written:");
	for (const { subject, toCheck } of forPerson) {
		console.warn(`  - ${subject}`);
		for (const line of toCheck) console.warn(`      ${line}`);
	}
	console.warn(
		`Fix them, or once you've checked each one, re-run with -- --confirm=${code}. The lock was not written.`,
	);
	return false;
}

const previous: Lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
const snapshot = buildSnapshot({ events: EVENT_SCHEMA, context: SESSION_CONTEXT_SCHEMA });
const changes = diffSnapshots(snapshotOf(previous), snapshot);

if (changes.length === 0) {
	console.log(`Lock is up to date (version ${previous.version}).`);
	process.exit(0);
}

const proposed = requiredBump(changes);
const bump = maxBump(proposed, requestedBump());
const version = bumpVersion(previous.version, bump);

for (const { bump, summary } of changes) console.log(`  [${bump}] ${summary}`);
console.log(
	`Proposed ${proposed} bump${bump === proposed ? "" : `, raised to ${bump}`}: ${previous.version} → ${version}`,
);

const apiKey = await typesafeApiKey();
if (!apiKey) console.warn("TYPESAFE_API_KEY isn't in .env, so Jev can't check these changes.");

const reviews = await reviewChanges(snapshotOf(previous), snapshot, apiKey);
if (!confirmedByPerson(reviews)) process.exit(1);

const lock: Lock = {
	version,
	updated: new Date().toISOString().slice(0, 10),
	reviews: reviews.map(({ subject, outcome }) => ({ subject, outcome })),
	...snapshot,
};
writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, "\t")}\n`);
console.log("Wrote registry.lock.json. Review the cookie policy before committing.");
