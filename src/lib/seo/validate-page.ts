import { pageId } from "./ids.ts";

const JSON_LD_SCRIPT = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
const CANONICAL_LINK = /<link[^>]*\brel="canonical"[^>]*\bhref="([^"]*)"/;
const NOINDEX_META = /<meta[^>]*\bname="robots"[^>]*\bcontent="[^"]*noindex/;
const REQUIRED_OPEN_GRAPH = ["og:title", "og:description", "og:url", "og:image"];

type Node = Record<string, unknown>;

const hasMetaDescription = (html: string): boolean => /<meta[^>]*\bname="description"[^>]*\bcontent="[^"]+"/.test(html);

const hasMetaProperty = (html: string, property: string): boolean =>
	new RegExp(`<meta[^>]*\\bproperty="${property}"[^>]*\\bcontent="[^"]+"`).test(html);

const isReference = (value: Node): boolean => Object.keys(value).length === 1 && "@id" in value;

const collectReferences = (value: unknown): string[] => {
	if (Array.isArray(value)) {
		return value.flatMap(collectReferences);
	}
	if (typeof value !== "object" || value === null) {
		return [];
	}
	if (isReference(value as Node)) {
		return [(value as Node)["@id"] as string];
	}
	return Object.values(value).flatMap(collectReferences);
};

const parseGraph = (script: string): Node[] | undefined => {
	try {
		const graph = JSON.parse(script)["@graph"];
		return Array.isArray(graph) ? graph : undefined;
	} catch {
		return undefined;
	}
};

const graphProblems = (graph: Node[], canonical: string): string[] => {
	const ids = new Set(graph.map((node) => node["@id"]));
	const types = new Set(graph.map((node) => node["@type"]));
	const isHome = new URL(canonical).pathname === "/";
	const expectedTypes = ["Organization", "WebSite", ...(isHome ? [] : ["BreadcrumbList"])];
	const page = graph.find((node) => node["@id"] === pageId(canonical));

	return [
		...expectedTypes.filter((type) => !types.has(type)).map((type) => `JSON-LD graph has no ${type}`),
		...(page === undefined ? [`JSON-LD graph has no page node with @id ${pageId(canonical)}`] : []),
		...(page !== undefined && page.url !== canonical
			? [`Page node url ${String(page.url)} is not the canonical URL`]
			: []),
		...collectReferences(graph)
			.filter((id) => !ids.has(id))
			.map((id) => `JSON-LD references ${id}, which is not in the graph`),
	];
};

/** What is wrong with a built page's canonical, Open Graph, and JSON-LD. Pages that ask not to be indexed are skipped. */
export const findSchemaProblems = (html: string): string[] => {
	if (NOINDEX_META.test(html)) {
		return [];
	}
	const canonical = CANONICAL_LINK.exec(html)?.[1];
	const scripts = [...html.matchAll(JSON_LD_SCRIPT)].map((match) => match[1]);
	const graph = scripts.length === 1 ? parseGraph(scripts[0]) : undefined;

	return [
		...(canonical === undefined ? ['Missing <link rel="canonical">'] : []),
		...(hasMetaDescription(html) ? [] : ["Missing meta description"]),
		...REQUIRED_OPEN_GRAPH.filter((property) => !hasMetaProperty(html, property)).map(
			(property) => `Missing ${property}`,
		),
		...(scripts.length !== 1 ? [`Expected one JSON-LD script, found ${scripts.length}`] : []),
		...(scripts.length === 1 && graph === undefined ? ["JSON-LD is not valid JSON with an @graph array"] : []),
		...(graph !== undefined && canonical !== undefined ? graphProblems(graph, canonical) : []),
	];
};
