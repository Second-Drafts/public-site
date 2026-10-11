import { describe, expect, it } from "vitest";
import { buildCsp } from "./csp";
import { VENDORS } from "./registry";

const directive = (name: string) =>
	buildCsp(VENDORS)
		.directives.find((entry) => entry.startsWith(`${name} `))!
		.split(" ")
		.slice(1);

const allOrigins = (kind: "scripts" | "data") => Object.values(VENDORS).flatMap((vendor) => vendor.origins[kind]);

describe("buildCsp", () => {
	it("allows every vendor script origin to load scripts", () => {
		expect(buildCsp(VENDORS).scriptResources).toEqual(["'self'", ...new Set(allOrigins("scripts"))]);
	});

	it("allows every vendor data origin for connections and images, and nothing else", () => {
		const expected = ["'self'", ...new Set(allOrigins("data"))];
		expect(directive("connect-src")).toEqual(expected);
		expect(directive("img-src")).toEqual(expected);
	});

	it("allows inline style attributes only, not inline style elements", () => {
		expect(buildCsp(VENDORS).styleResources).toEqual([{ resource: "'unsafe-inline'", kind: "attribute" }]);
	});

	it("keeps everything else same-origin", () => {
		expect(buildCsp(VENDORS).directives).toEqual(
			expect.arrayContaining(["default-src 'self'", "font-src 'self'", "object-src 'none'", "base-uri 'self'"]),
		);
	});

	it("is generated: a new vendor's origins appear without editing the builder", () => {
		const csp = buildCsp({
			...VENDORS,
			extra: { origins: { scripts: ["https://scripts.example"], data: ["https://data.example"] } },
		});
		expect(csp.scriptResources).toContain("https://scripts.example");
		expect(csp.directives.join(";")).toContain("connect-src 'self'");
		expect(csp.directives.join(";")).toContain("https://data.example");
	});

	it("lists a shared origin once", () => {
		const csp = buildCsp({
			a: { origins: { scripts: ["https://x.example"], data: [] } },
			b: { origins: { scripts: ["https://x.example"], data: [] } },
		});
		expect(csp.scriptResources).toEqual(["'self'", "https://x.example"]);
	});
});
