import { execFileSync } from "node:child_process";
import ghPages from "gh-pages";

const SCAN_REPORT = "privacy/scan-report.json";

function commitScanReport() {
	const status = execFileSync("git", ["status", "--porcelain", "--", SCAN_REPORT], { encoding: "utf8" });
	if (status.trim() === "") return;
	execFileSync("git", ["commit", "--quiet", "--message", "Record privacy scan for deploy", "--", SCAN_REPORT]);
	console.log(`Committed ${SCAN_REPORT}. Push it so the scan of this release is in the shared history.`);
}

ghPages.publish(
	"dist",
	{
		message: "Deploy",
		dotfiles: true,
	},
	(err) => {
		if (err) {
			console.error(err);
			return;
		}
		console.log("Deployed to GitHub Pages");
		commitScanReport();
	},
);
