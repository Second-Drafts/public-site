// Regenerates src/lib/privacy/registry.lock.json from the registry, proposing the version bump the changes require.
// Usage: npm run privacy:lock [-- --bump=minor|major]  (a requested bump can raise the proposal, never lower it)
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
} from "../src/lib/privacy/lock.ts";

const LOCK_PATH = new URL("../src/lib/privacy/registry.lock.json", import.meta.url);
const BUMPS: Bump[] = ["patch", "minor", "major"];

function requestedBump(): Bump {
	const flag = process.argv.find((arg) => arg.startsWith("--bump="));
	if (!flag) return "patch";
	const value = flag.slice("--bump=".length) as Bump;
	if (!BUMPS.includes(value)) throw new Error(`--bump must be one of ${BUMPS.join(", ")}`);
	return value;
}

const previous: Lock = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
const snapshot = buildSnapshot();
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

const lock: Lock = { version, updated: new Date().toISOString().slice(0, 10), ...snapshot };
writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, "\t")}\n`);
console.log("Wrote registry.lock.json. Review the cookie policy before committing.");
