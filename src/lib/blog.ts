import { getCollection } from "astro:content";

/** Published posts, newest first. */
export const getPublishedPosts = async () => {
	const posts = await getCollection("blog", ({ data }) => !data.draft);
	return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
};

export const formatDate = (date: Date): string =>
	date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	});
