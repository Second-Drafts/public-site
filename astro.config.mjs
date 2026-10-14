// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

import { buildCsp } from "./src/lib/privacy/csp.ts";
import { VENDORS } from "./src/lib/privacy/registry.ts";

import favicons from "astro-favicons";

const { directives, scriptResources, styleResources } = buildCsp(VENDORS);

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
    integrations: [{
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
		}, sitemap({ filter: (page) => !isInternalPage(page) }), favicons()],
});