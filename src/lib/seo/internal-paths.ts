/** Pages are served from directories, so GitHub Pages redirects `/about-us` to `/about-us/`. Links should skip the hop. */
export const isUnslashedPagePath = (href: string): boolean => {
	if (!href.startsWith("/") || href.startsWith("//")) {
		return false;
	}
	const path = href.split(/[?#]/)[0];
	const lastSegment = path.slice(path.lastIndexOf("/") + 1);
	return lastSegment !== "" && !lastSegment.includes(".");
};

const HREF_ATTRIBUTE = /<a\b[^>]*\shref="([^"]*)"/g;

export const findUnslashedInternalLinks = (html: string): string[] =>
	[...html.matchAll(HREF_ATTRIBUTE)].map((match) => match[1]).filter(isUnslashedPagePath);
