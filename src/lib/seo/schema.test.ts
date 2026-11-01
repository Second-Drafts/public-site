import { describe, expect, it } from "vitest";
import {
	blogPosting,
	buildGraph,
	faqPage,
	organizationId,
	serializeJsonLd,
	toolSchema,
	webApplication,
	websiteId,
} from "./schema";
import { breadcrumbTrail } from "./site";

const site = new URL("https://seconddrafts.com/");
const url = "https://seconddrafts.com/tools/word-counter/";
const page = { site, url, name: "Word Counter", description: "Count words." };
const trail = breadcrumbTrail("/tools/word-counter/", "Word Counter", site);
const imageUrl = "https://seconddrafts.com/img/og/site.png";

const nodesOf = (graph: ReturnType<typeof buildGraph>) => graph["@graph"] as unknown as Record<string, unknown>[];

describe("breadcrumbTrail", () => {
	it("walks from home through each section to the page", () => {
		expect(trail.map((crumb) => crumb.name)).toEqual(["Home", "Tools", "Word Counter"]);
		expect(trail.map((crumb) => crumb.url)).toEqual([
			"https://seconddrafts.com/",
			"https://seconddrafts.com/tools/",
			url,
		]);
	});

	it("gives the home page no trail", () => {
		expect(breadcrumbTrail("/", undefined, site)).toEqual([]);
	});

	it("names nested sections", () => {
		const names = breadcrumbTrail("/tools/continuity-checker/waitlist/", "Waitlist", site).map((crumb) => crumb.name);
		expect(names).toEqual(["Home", "Tools", "Continuity Checker", "Waitlist"]);
	});

	it("throws on a section it has no name for", () => {
		expect(() => breadcrumbTrail("/mystery/page/", "Page", site)).toThrow(/mystery/);
	});

	it("throws when a page below home has no title", () => {
		expect(() => breadcrumbTrail("/tools/", undefined, site)).toThrow(/title/);
	});
});

describe("buildGraph", () => {
	const graph = buildGraph(page, {
		type: "WebPage",
		trail,
		imageUrl,
		extraNodes: toolSchema({ appName: "Word counter" }),
	});
	const nodes = nodesOf(graph);

	it("holds the organization, website, page, breadcrumbs and extra nodes with stable ids", () => {
		expect(nodes.map((node) => node["@id"])).toEqual([
			organizationId(site),
			websiteId(site),
			`${url}#webpage`,
			`${url}#breadcrumb`,
			`${url}#application`,
		]);
	});

	it("links the page to its website and breadcrumb by reference", () => {
		const pageNode = nodes[2];
		expect(pageNode.isPartOf).toEqual({ "@id": websiteId(site) });
		expect(pageNode.breadcrumb).toEqual({ "@id": `${url}#breadcrumb` });
	});

	it("leaves out the breadcrumb on the home page", () => {
		const home = buildGraph({ ...page, url: site.href }, { type: "WebPage", trail: [], imageUrl });
		const nodes = nodesOf(home);
		expect(nodes.map((node) => node["@type"])).toEqual(["Organization", "WebSite", "WebPage"]);
		expect(nodes[2]).not.toHaveProperty("breadcrumb");
	});

	it("uses the page type it is given and records when it was modified", () => {
		const modified = new Date("2026-10-01T00:00:00Z");
		const about = nodesOf(buildGraph(page, { type: "AboutPage", trail, imageUrl, dateModified: modified }))[2];
		expect(about["@type"]).toBe("AboutPage");
		expect(about.dateModified).toBe("2026-10-01T00:00:00.000Z");
	});
});

describe("page-specific nodes", () => {
	it("describes a tool as a free web application", () => {
		expect(webApplication("Word counter")(page)).toMatchObject({
			"@type": "WebApplication",
			name: "Word counter",
			isAccessibleForFree: true,
			publisher: { "@id": organizationId(site) },
		});
	});

	it("turns an FAQ into questions with accepted answers", () => {
		const node = faqPage([{ question: "Why?", answer: "Because." }])(page);
		expect(node).toMatchObject({
			"@type": "FAQPage",
			mainEntity: [{ "@type": "Question", name: "Why?", acceptedAnswer: { text: "Because." } }],
		});
	});

	it("builds no nodes for a tool with neither an app name nor an FAQ", () => {
		expect(toolSchema({})).toEqual([]);
	});

	it("credits a post to the organization and defaults the modified date to the publish date", () => {
		const published = new Date("2026-10-11T00:00:00Z");
		const node = blogPosting({ datePublished: published })({ ...page, name: "Bon Idée" });
		expect(node).toMatchObject({
			"@type": "BlogPosting",
			headline: "Bon Idée",
			author: { "@id": organizationId(site) },
			datePublished: published.toISOString(),
			dateModified: published.toISOString(),
		});
	});
});

describe("serializeJsonLd", () => {
	it("cannot be closed early by page text", () => {
		const graph = buildGraph(
			{ ...page, description: "</script><script>alert(1)</script>" },
			{ type: "WebPage", trail, imageUrl },
		);
		const json = serializeJsonLd(graph);
		expect(json).not.toContain("<");
		expect(JSON.parse(json)["@graph"][2].description).toBe("</script><script>alert(1)</script>");
	});
});
