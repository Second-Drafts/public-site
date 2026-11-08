import { getCollection } from "astro:content";
import { CATEGORIES, type CategoryKey, DESKS, type DeskKey } from "./blog-taxonomy";
import { SITE_NAME } from "./seo/site";

/** Published posts, newest first. */
export const getPublishedPosts = async () => {
	const posts = await getCollection("blog", ({ data }) => !data.draft);
	return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
};

export interface PostFilter {
	category?: CategoryKey;
	desk?: DeskKey;
}

/** Published posts in a category, from a desk, or both. An empty filter lets every post through. */
export const getFilteredPosts = async ({ category, desk }: PostFilter) => {
	const posts = await getPublishedPosts();
	return posts.filter((post) => (!category || post.data.category === category) && (!desk || post.data.author === desk));
};

export interface Listing {
	title: string;
	description: string;
}

/** Lowercases the first letter, so "The Editorial Desk" reads "the Editorial Desk" mid-sentence. */
const midSentence = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

const listing = (title: string, summary: string): Listing => ({
	title,
	description: `${SITE_NAME} blog: ${midSentence(title)}. ${summary}`,
});

export const deskListing = (desk: DeskKey): Listing =>
	listing(`Posts from ${midSentence(DESKS[desk].name)}`, DESKS[desk].description);

export const categoryListing = (category: CategoryKey): Listing =>
	listing(`Posts on ${midSentence(CATEGORIES[category].label)}`, CATEGORIES[category].description);

export const formatDate = (date: Date): string =>
	date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	});
