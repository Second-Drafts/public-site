import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ADJACENT_TEXT_ATTRIBUTE, findCrampedInlineTags } from "../src/lib/inline-spacing.ts";

const DIST_DIR = "dist";

const pages = readdirSync(DIST_DIR, { recursive: true, encoding: "utf8" }).filter((path) => path.endsWith(".html"));
const problems = pages.flatMap((page) =>
	findCrampedInlineTags(readFileSync(join(DIST_DIR, page), "utf8")).map((context) => `  ${page}: ${context}`),
);

if (problems.length > 0) {
	console.error(
		[
			"Text runs into an inline tag with no space between:",
			...problems,
			`End the line before the tag with {" "}, move the letters inside the tag, or mark the element ${ADJACENT_TEXT_ATTRIBUTE} if they should touch.`,
		].join("\n"),
	);
	process.exit(1);
}

console.log(`Inline spacing check passed (${pages.length} pages).`);
