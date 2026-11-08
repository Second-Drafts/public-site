import { describe, expect, it } from "vitest";
import { findUnslashedInternalLinks, isUnslashedPagePath } from "./internal-paths";

describe("isUnslashedPagePath", () => {
	it.each(["/about-us", "/tools/teleprompter", "/blog/bon-idee#top", "/tools?ref=nav"])("flags %s", (href) => {
		expect(isUnslashedPagePath(href)).toBe(true);
	});

	it.each([
		"/",
		"/about-us/",
		"/blog/bon-idee/#top",
		"/favicon.svg",
		"/_astro/Base.BP3iS5pR.css",
		"//cdn.example.com/x",
		"https://seconddrafts.com/about-us",
		"mailto:hello@seconddrafts.com",
		"#top",
	])("allows %s", (href) => {
		expect(isUnslashedPagePath(href)).toBe(false);
	});
});

describe("findUnslashedInternalLinks", () => {
	it("lists the anchors that point at a page without its trailing slash", () => {
		const html = `<a class="x" href="/about-us">a</a><a href="/blog/">b</a><a href="/tools/teleprompter">c</a>`;
		expect(findUnslashedInternalLinks(html)).toEqual(["/about-us", "/tools/teleprompter"]);
	});

	it("ignores stylesheet and icon links", () => {
		expect(findUnslashedInternalLinks(`<link rel="icon" href="/favicon">`)).toEqual([]);
	});
});
