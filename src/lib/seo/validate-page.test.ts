import { describe, expect, it } from "vitest";
import { buildGraph, serializeJsonLd } from "./schema";
import { breadcrumbTrail } from "./site";
import { findSchemaProblems } from "./validate-page";

const site = new URL("https://seconddrafts.com/");
const imageUrl = "https://seconddrafts.com/img/og/site.png";

const pageHtml = (path: string, { head = "", graphScript }: { head?: string; graphScript?: string } = {}) => {
	const url = new URL(path, site).href;
	const trail = breadcrumbTrail(path, "A page", site);
	const graph = buildGraph(
		{ site, url, name: "A page", description: "About it.", imageUrl },
		{ type: "WebPage", trail },
	);
	return `<html><head>
		<meta name="description" content="About it.">
		<link rel="canonical" href="${url}">
		<meta property="og:title" content="A page"><meta property="og:description" content="About it.">
		<meta property="og:url" content="${url}"><meta property="og:image" content="${imageUrl}">
		${graphScript ?? `<script type="application/ld+json">${serializeJsonLd(graph)}</script>`}
		${head}
	</head></html>`;
};

const withGraph = (path: string, edit: (graph: { "@graph": Record<string, unknown>[] }) => void) => {
	const url = new URL(path, site).href;
	const graph = buildGraph(
		{ site, url, name: "A page", description: "About it.", imageUrl },
		{ type: "WebPage", trail: breadcrumbTrail(path, "A page", site) },
	) as unknown as { "@graph": Record<string, unknown>[] };
	edit(graph);
	return pageHtml(path, { graphScript: `<script type="application/ld+json">${JSON.stringify(graph)}</script>` });
};

describe("findSchemaProblems", () => {
	it("passes a page built the way SeoHead builds it", () => {
		expect(findSchemaProblems(pageHtml("/tools/"))).toEqual([]);
		expect(findSchemaProblems(pageHtml("/"))).toEqual([]);
	});

	it("skips pages that ask not to be indexed", () => {
		expect(findSchemaProblems(`<html><head><meta name="robots" content="noindex"></head></html>`)).toEqual([]);
	});

	it("reports a missing canonical and Open Graph tags", () => {
		const problems = findSchemaProblems(`<html><head><script type="application/ld+json">{}</script></head></html>`);
		expect(problems).toContain(`Missing <link rel="canonical">`);
		expect(problems).toContain("Missing meta description");
		expect(problems).toContain("Missing og:title");
		expect(problems).toContain("Missing og:image");
	});

	it("reports a page with no JSON-LD or with two scripts", () => {
		const html = pageHtml("/tools/");
		const script = html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/)![0];
		expect(findSchemaProblems(html.replace(script, ""))).toContain("Expected one JSON-LD script, found 0");
		expect(findSchemaProblems(html.replace(script, script + script))).toContain("Expected one JSON-LD script, found 2");
	});

	it("reports JSON-LD that does not parse", () => {
		const html = pageHtml("/tools/", { graphScript: `<script type="application/ld+json">{nope</script>` });
		expect(findSchemaProblems(html)).toContain("JSON-LD is not valid JSON with an @graph array");
	});

	it("reports a graph missing a required node", () => {
		const html = withGraph("/tools/", (graph) => {
			graph["@graph"] = graph["@graph"].filter(
				(node) => node["@type"] !== "BreadcrumbList" && node["@type"] !== "WebSite",
			);
		});
		const problems = findSchemaProblems(html);
		expect(problems).toContain("JSON-LD graph has no WebSite");
		expect(problems).toContain("JSON-LD graph has no BreadcrumbList");
	});

	it("reports a page node whose url is not the canonical URL", () => {
		const html = withGraph("/tools/", (graph) => {
			graph["@graph"][2].url = "https://seconddrafts.com/elsewhere/";
		});
		expect(findSchemaProblems(html)).toEqual([
			"Page node url https://seconddrafts.com/elsewhere/ is not the canonical URL",
		]);
	});

	it("reports a reference that points outside the graph", () => {
		const html = withGraph("/tools/", (graph) => {
			graph["@graph"][2].isPartOf = { "@id": "https://seconddrafts.com/#missing" };
		});
		expect(findSchemaProblems(html)).toEqual([
			"JSON-LD references https://seconddrafts.com/#missing, which is not in the graph",
		]);
	});
});
