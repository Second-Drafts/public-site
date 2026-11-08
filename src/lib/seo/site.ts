import { ORGANIZATION } from "../privacy/organization";

export const SITE_NAME = ORGANIZATION;

/** Names the URL segments that have pages of their own, for breadcrumbs. */
export const SECTION_NAMES: Record<string, string> = {
	tools: "Tools",
	blog: "Blog",
	category: "Categories",
	desk: "Desks",
	"continuity-checker": "Continuity Checker",
};

export const absoluteUrl = (path: string, site: URL): string => new URL(path, site).href;

export interface Crumb {
	name: string;
	url: string;
}

const sectionName = (segment: string): string => {
	const name = SECTION_NAMES[segment];
	if (name === undefined) {
		throw new Error(
			`No breadcrumb name for the URL segment "${segment}". Add it to SECTION_NAMES in src/lib/seo/site.ts.`,
		);
	}
	return name;
};

/** Home, then each section on the way down, then the page itself. The home page has no trail. */
export const breadcrumbTrail = (pathname: string, pageName: string | undefined, site: URL): Crumb[] => {
	const segments = pathname.split("/").filter(Boolean);
	if (segments.length === 0) {
		return [];
	}
	if (pageName === undefined) {
		throw new Error(`The page at ${pathname} needs a title to name its breadcrumb.`);
	}
	const sections = segments.slice(0, -1).map((segment, index) => ({
		name: sectionName(segment),
		url: absoluteUrl(`/${segments.slice(0, index + 1).join("/")}/`, site),
	}));
	return [
		{ name: "Home", url: absoluteUrl("/", site) },
		...sections,
		{ name: pageName, url: absoluteUrl(pathname, site) },
	];
};
