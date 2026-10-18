// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";
import favicons from "astro-favicons";

import { buildCsp } from "./src/lib/privacy/csp.ts";
import { VENDORS } from "./src/lib/privacy/registry.ts";
import tokens from "./design-system/tokens.json" with { type: "json" };

const { directives, scriptResources, styleResources } = buildCsp(VENDORS);

const paper = tokens.color.tokens.find((token) => token.name === "paper")?.value;
if (!paper?.light) throw new Error("design-system/tokens.json needs a light paper colour");

/**
 *
 * @param {string} pageString
 * @returns {boolean}
 */
const isInternalPage = (pageString) => {
	return pageString.includes("sandbox");
};

// https://astro.build/config
export default defineConfig({
	site: "https://seconddrafts.com",
	vite: { envDir: "./public-env" },
	security: {
		csp: { directives, scriptDirective: { resources: scriptResources }, styleDirective: { resources: styleResources } },
	},
	integrations: [
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
		sitemap({ filter: (page) => !isInternalPage(page) }),
		// Head tags live in Base.astro: the plugin's own tags would make home-screen saves open as a standalone app.
		favicons({
			background: paper.light,
			output: { html: false },
			icons: {
				favicons: ["favicon.ico"],
				appleIcon: ["apple-touch-icon.png"],
				android: false,
				appleStartup: false,
				windows: false,
				yandex: false,
			},
		}),
	],
});
