import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { findUnslashedInternalLinks } from "../src/lib/seo/internal-paths.ts";

const DIST_DIR = "dist";

const pages = readdirSync(DIST_DIR, { recursive: true, encoding: "utf8" }).filter((path) => path.endsWith(".html"));
const problems = pages.flatMap((page) =>
	findUnslashedInternalLinks(readFileSync(join(DIST_DIR, page), "utf8")).map((href) => `  ${page}: ${href}`),
);

if (problems.length > 0) {
	console.error(
		["Internal links without a trailing slash (each costs a redirect and splits search signal):", ...problems].join(
			"\n",
		),
	);
	process.exit(1);
}

console.log(`Link check passed (${pages.length} pages).`);
