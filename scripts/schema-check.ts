import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { findSchemaProblems } from "../src/lib/seo/validate-page.ts";

const DIST_DIR = "dist";

const pages = readdirSync(DIST_DIR, { recursive: true, encoding: "utf8" }).filter((path) => path.endsWith(".html"));
const problems = pages.flatMap((page) =>
	findSchemaProblems(readFileSync(join(DIST_DIR, page), "utf8")).map((problem) => `  ${page}: ${problem}`),
);

if (problems.length > 0) {
	console.error(["Pages with missing or broken canonical, Open Graph, or JSON-LD:", ...problems].join("\n"));
	process.exit(1);
}

console.log(`Schema check passed (${pages.length} pages).`);
