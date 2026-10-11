import type { AstroUserConfig } from "astro";
import type { VENDORS } from "./registry.ts";

type CspConfig = Exclude<NonNullable<AstroUserConfig["security"]>["csp"], boolean | undefined>;

type VendorOrigins = { origins: { scripts: readonly string[]; data: readonly string[] } };

const SELF = "'self'";

// Inline style attributes only carry values our own components compute; <style> elements stay hash-restricted.
const INLINE_STYLE_ATTRIBUTES = { resource: "'unsafe-inline'", kind: "attribute" } as const;

function allowList(...origins: (readonly string[])[]): string[] {
	return [SELF, ...new Set(origins.flat())];
}

export function buildCsp(vendors: Record<string, VendorOrigins> | typeof VENDORS): {
	directives: NonNullable<CspConfig["directives"]>;
	scriptResources: string[];
	styleResources: (string | typeof INLINE_STYLE_ATTRIBUTES)[];
} {
	const all = Object.values(vendors as Record<string, VendorOrigins>);
	const dataOrigins = all.flatMap((vendor) => vendor.origins.data);
	return {
		styleResources: [INLINE_STYLE_ATTRIBUTES],
		scriptResources: allowList(all.flatMap((vendor) => vendor.origins.scripts)),
		directives: [
			`default-src ${SELF}`,
			`connect-src ${allowList(dataOrigins).join(" ")}`,
			`img-src ${allowList(dataOrigins).join(" ")}`,
			`font-src ${SELF}`,
			"object-src 'none'",
			`base-uri ${SELF}`,
			`form-action ${SELF}`,
		],
	};
}
