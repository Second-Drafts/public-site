import { execFileSync } from "node:child_process";
import ghPages from "gh-pages";

const SCAN_REPORT = "privacy/scan-report.json";

function git(...args) {
	return execFileSync("git", args, { encoding: "utf8" }).trimEnd();
}

function commitScanReport(sourceCommit) {
	if (git("status", "--porcelain", "--", SCAN_REPORT) === "") return;
	git("commit", "--quiet", "--message", `Record privacy scan for deploy of ${sourceCommit}`, "--", SCAN_REPORT);
	console.log(`Committed ${SCAN_REPORT}.`);
}

const sourceCommit = git("rev-parse", "--short", "HEAD");

ghPages.publish(
	"dist",
	{
		message: `Deploy ${sourceCommit}`,
		dotfiles: true,
	},
	(err) => {
		if (err) {
			console.error(err);
			process.exitCode = 1;
			return;
		}
		console.log(`Deployed ${sourceCommit} to GitHub Pages.`);
		commitScanReport(sourceCommit);
		console.log("Run `git push` so the deployed source and its privacy scan are in the shared history.");
	},
);
