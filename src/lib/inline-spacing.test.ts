import { describe, expect, it } from "vitest";
import { findCrampedInlineTags } from "./inline-spacing";

describe("findCrampedInlineTags", () => {
	it("flags text running into an opening tag", () => {
		const html = `<p>as long as the<a href="/cookie-policy" class="sd-link">cookie policy</a> says</p>`;
		expect(findCrampedInlineTags(html)).toEqual(["as long as the<a>cookie policy says"]);
	});

	it("flags text running out of a closing tag", () => {
		expect(findCrampedInlineTags(`<p>read the <strong>policy</strong>today</p>`)).toEqual([
			"read the policy</strong>today",
		]);
	});

	it("allows spaces and punctuation around inline tags", () => {
		const html = `<p>see the <a href="/x">cookie policy</a>. Or (<em>maybe</em>) <code>npm</code>, then go.</p>`;
		expect(findCrampedInlineTags(html)).toEqual([]);
	});

	it("skips both sides of an element marked as intentionally adjacent", () => {
		expect(findCrampedInlineTags(`<p>re<strong data-adjacent-text>draft</strong>ed</p>`)).toEqual([]);
	});

	it("still checks unmarked tags nested inside a marked one", () => {
		const html = `<p>re<strong data-adjacent-text>dr<em>af</em>t</strong>ed</p>`;
		expect(findCrampedInlineTags(html)).toHaveLength(2);
	});

	it("ignores block and layout tags", () => {
		expect(findCrampedInlineTags(`<div>one<span>two</span>three</div>`)).toEqual([]);
	});

	it("ignores markup inside scripts and styles", () => {
		const html = `<script>const html = "x<a>y</a>z";</script><style>a::after{content:"x<b>"}</style><p>fine</p>`;
		expect(findCrampedInlineTags(html)).toEqual([]);
	});

	it("does not mistake longer tag names for inline tags", () => {
		expect(findCrampedInlineTags(`<p>word<article>text</article>word</p>`)).toEqual([]);
	});
});
