import { execFileSync } from "node:child_process";

const RELEASE_BRANCH = "main";
const SCAN_REPORT = "privacy/scan-report.json";

function git(...args: string[]) {
	return execFileSync("git", args, { encoding: "utf8" }).trimEnd();
}

function currentBranchProblem() {
	const branch = git("branch", "--show-current");
	if (branch === RELEASE_BRANCH) return [];
	const where = branch === "" ? "a detached HEAD" : `"${branch}"`;
	return [
		`Deploys go out from ${RELEASE_BRANCH}, but you are on ${where}. Merge your work and run \`git switch ${RELEASE_BRANCH}\`.`,
	];
}

function uncommittedChangesProblem() {
	const changes = git("status", "--porcelain", "--", ".", `:(exclude)${SCAN_REPORT}`);
	if (changes === "") return [];
	return [
		[
			"The working tree has uncommitted changes, so the build would not match any commit:",
			...changes.split("\n").map((line) => `  ${line}`),
			"Commit or stash them first.",
		].join("\n"),
	];
}

const problems = [...currentBranchProblem(), ...uncommittedChangesProblem()];

if (problems.length > 0) {
	console.error(["Not deploying.", ...problems].join("\n"));
	process.exit(1);
}

console.log(`Deploy preflight passed (clean ${RELEASE_BRANCH} at ${git("rev-parse", "--short", "HEAD")}).`);
