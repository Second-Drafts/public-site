import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { CATEGORY_KEYS, DEFAULT_DESK, DESK_KEYS } from "./lib/blog-taxonomy";

const blog = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.coerce.date(),
		updated: z.coerce.date().optional(),
		draft: z.boolean().default(false),
		author: z.enum(DESK_KEYS).default(DEFAULT_DESK),
		category: z.enum(CATEGORY_KEYS),
	}),
});

export const collections = { blog };
