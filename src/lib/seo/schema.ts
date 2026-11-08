import type { BreadcrumbList, Graph, Thing, WebPage } from "schema-dts";
import { CATEGORIES, type CategoryKey, DEFAULT_DESK, DESKS, type DeskKey, deskPath } from "../blog-taxonomy";
import type { FaqItem } from "./faq";
import { pageId } from "./ids.ts";
import { absoluteUrl, type Crumb, SITE_NAME } from "./site";

export type PageType = "WebPage" | "AboutPage" | "CollectionPage";

/** What a page-specific node needs to know about the page it describes. */
export interface PageContext {
	site: URL;
	url: string;
	name: string;
	description: string;
}

export type SchemaNode = (page: PageContext) => Thing;

const reference = (id: string) => ({ "@id": id });

export const organizationId = (site: URL) => absoluteUrl("/#organization", site);
export const websiteId = (site: URL) => absoluteUrl("/#website", site);

const organization = (site: URL): Thing => ({
	"@type": "Organization",
	"@id": organizationId(site),
	name: SITE_NAME,
	url: site.href,
	logo: { "@type": "ImageObject", url: absoluteUrl("/apple-touch-icon.png", site) },
});

const webSite = (site: URL): Thing => ({
	"@type": "WebSite",
	"@id": websiteId(site),
	url: site.href,
	name: SITE_NAME,
	inLanguage: "en",
	publisher: reference(organizationId(site)),
});

const breadcrumbList = (page: PageContext, trail: Crumb[]): BreadcrumbList => ({
	"@type": "BreadcrumbList",
	"@id": `${page.url}#breadcrumb`,
	itemListElement: trail.map((crumb, index) => ({
		"@type": "ListItem",
		position: index + 1,
		name: crumb.name,
		item: crumb.url,
	})),
});

interface PageNodeOptions {
	type: PageType;
	trail: Crumb[];
	imageUrl: string;
	dateModified?: Date;
}

const pageNode = (page: PageContext, { type, trail, imageUrl, dateModified }: PageNodeOptions): WebPage => ({
	"@type": type,
	"@id": pageId(page.url),
	url: page.url,
	name: page.name,
	description: page.description,
	inLanguage: "en",
	isPartOf: reference(websiteId(page.site)),
	primaryImageOfPage: { "@type": "ImageObject", url: imageUrl },
	...(trail.length > 0 && { breadcrumb: reference(`${page.url}#breadcrumb`) }),
	...(dateModified && { dateModified: dateModified.toISOString() }),
});

export interface GraphOptions extends PageNodeOptions {
	extraNodes?: SchemaNode[];
}

export const buildGraph = (page: PageContext, { extraNodes = [], ...pageOptions }: GraphOptions): Graph => ({
	"@context": "https://schema.org",
	"@graph": [
		organization(page.site),
		webSite(page.site),
		pageNode(page, pageOptions),
		...(pageOptions.trail.length > 0 ? [breadcrumbList(page, pageOptions.trail)] : []),
		...extraNodes.map((node) => node(page)),
	],
});

/** Escapes "<" so page text can never close the script element it sits in. */
export const serializeJsonLd = (graph: Graph): string => JSON.stringify(graph).replaceAll("<", "\\u003c");

export const webApplication =
	(name: string): SchemaNode =>
	(page) => ({
		"@type": "WebApplication",
		"@id": `${page.url}#application`,
		name,
		url: page.url,
		description: page.description,
		applicationCategory: "UtilitiesApplication",
		operatingSystem: "Any",
		browserRequirements: "Requires a modern browser with JavaScript enabled.",
		isAccessibleForFree: true,
		offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
		publisher: reference(organizationId(page.site)),
		mainEntityOfPage: reference(pageId(page.url)),
	});

export const faqPage =
	(faq: FaqItem[]): SchemaNode =>
	(page) => ({
		"@type": "FAQPage",
		"@id": `${page.url}#faq`,
		url: page.url,
		isPartOf: reference(websiteId(page.site)),
		mainEntity: faq.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: { "@type": "Answer", text: item.answer },
		})),
	});

export const toolSchema = ({ appName, faq = [] }: { appName?: string; faq?: FaqItem[] }): SchemaNode[] => [
	...(appName ? [webApplication(appName)] : []),
	...(faq.length > 0 ? [faqPage(faq)] : []),
];

export const blog = (): SchemaNode => (page) => ({
	"@type": "Blog",
	"@id": `${page.url}#blog`,
	url: page.url,
	name: page.name,
	description: page.description,
	inLanguage: "en",
	publisher: reference(organizationId(page.site)),
	mainEntityOfPage: reference(pageId(page.url)),
});

interface BlogPostingOptions {
	datePublished: Date;
	dateModified?: Date;
	author: DeskKey;
	category: CategoryKey;
}

export const deskId = (desk: DeskKey, site: URL): string =>
	desk === DEFAULT_DESK ? organizationId(site) : absoluteUrl(deskPath(desk), site);

const deskOrganization =
	(desk: DeskKey): SchemaNode =>
	(page) => ({
		"@type": "Organization",
		"@id": deskId(desk, page.site),
		name: DESKS[desk].name,
		description: DESKS[desk].description,
		url: deskId(desk, page.site),
		parentOrganization: reference(organizationId(page.site)),
	});

const blogPostingNode =
	({ datePublished, dateModified, author, category }: BlogPostingOptions): SchemaNode =>
	(page) => ({
		"@type": "BlogPosting",
		"@id": `${page.url}#article`,
		headline: page.name,
		description: page.description,
		url: page.url,
		inLanguage: "en",
		datePublished: datePublished.toISOString(),
		dateModified: (dateModified ?? datePublished).toISOString(),
		articleSection: CATEGORIES[category].label,
		author: reference(deskId(author, page.site)),
		publisher: reference(organizationId(page.site)),
		mainEntityOfPage: reference(pageId(page.url)),
	});

/** The post, and a node for its desk, a part of the Department, unless the Department itself wrote it. */
export const blogPosting = (options: BlogPostingOptions): SchemaNode[] => [
	...(options.author === DEFAULT_DESK ? [] : [deskOrganization(options.author)]),
	blogPostingNode(options),
];
