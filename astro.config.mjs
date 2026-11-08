// @ts-check
import { defineConfig } from "astro/config";

import { existsSync, readFileSync } from "node:fs";

import sitemap from "@astrojs/sitemap";

import { buildCsp } from "./src/lib/privacy/csp.ts";
import { VENDORS } from "./src/lib/privacy/registry.ts";

const { directives, scriptResources, styleResources } = buildCsp(VENDORS);

/**
 *
 * @param {string} pageString
 * @returns {boolean}
 */
const isInternalPage = (pageString) => {
	return pageString.includes("sandbox");
};

/** Where the build writes pages, read once Astro has resolved the config. */
let outDir = new URL("./dist/", import.meta.url);

/**
 * A built page that asks not to be indexed stays out of the sitemap too.
 *
 * @param {string} pageString
 * @returns {boolean}
 */
const isNoindexPage = (pageString) => {
	const file = new URL(`.${new URL(pageString).pathname}index.html`, outDir);
	return existsSync(file) && /<meta name="robots" content="noindex"/.test(readFileSync(file, "utf8"));
};

// https://astro.build/config
export default defineConfig({
	site: "https://seconddrafts.com",
	trailingSlash: "always",
	vite: { envDir: "./public-env" },
	security: {
		csp: { directives, scriptDirective: { resources: scriptResources }, styleDirective: { resources: styleResources } },
	},
	integrations: [
		{
			name: "out-dir",
			hooks: {
				"astro:config:done": ({ config }) => {
					outDir = config.outDir;
				},
			},
		},
		{
			name: "dev-pages",
			hooks: {
				"astro:build:setup": (options) => {
					const pagesMap = options.pages;
					for (const [key, page] of pagesMap.entries()) {
						if (isInternalPage(page.component)) {
							pagesMap.delete(key);
						}
					}
				},
			},
		},
		sitemap({ filter: (page) => !isInternalPage(page) && !isNoindexPage(page) }),
	],
});
