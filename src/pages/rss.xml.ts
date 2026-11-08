import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getPublishedPosts } from "../lib/blog";
import { CATEGORIES, DESKS } from "../lib/blog-taxonomy";
import { SITE_NAME } from "../lib/seo/site";

const escapeXml = (text: string): string =>
	text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export async function GET(context: APIContext) {
	const posts = await getPublishedPosts();
	const feedUrl = new URL("/rss.xml", context.site).href;
	return rss({
		title: `${SITE_NAME}: Blog`,
		description: "Thoughts on writing, editing, and storytelling, and the current state of the Department.",
		site: context.site!,
		xmlns: { atom: "http://www.w3.org/2005/Atom", dc: "http://purl.org/dc/elements/1.1/" },
		customData: `<language>en</language><atom:link href="${feedUrl}" rel="self" type="application/rss+xml"/>`,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.date,
			link: `/blog/${post.id}/`,
			categories: [CATEGORIES[post.data.category].label],
			customData: `<dc:creator>${escapeXml(DESKS[post.data.author].name)}</dc:creator>`,
		})),
	});
}
