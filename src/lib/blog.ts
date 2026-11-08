import { getCollection } from "astro:content";
import { CATEGORY_KEYS, type CategoryKey } from "./blog-taxonomy";

/** Published posts, newest first. */
export const getPublishedPosts = async () => {
	const posts = await getCollection("blog", ({ data }) => !data.draft);
	return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
};

/** Categories with at least one published post, in their listed order. An empty category gets no page or filter. */
export const getPublishedCategories = async (): Promise<CategoryKey[]> => {
	const posts = await getPublishedPosts();
	return CATEGORY_KEYS.filter((category) => posts.some((post) => post.data.category === category));
};

export const formatDate = (date: Date): string =>
	date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	});
