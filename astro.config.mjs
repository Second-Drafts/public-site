// @ts-check
import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

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
  ],
});
