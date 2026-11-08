import { isUnslashedPagePath } from "../../src/lib/seo/internal-paths.ts";

const MESSAGE =
	"Internal page paths end in a slash: GitHub Pages redirects the slashless form, and the redirect splits search signal.";

interface Node {
	value?: unknown;
	quasis?: { value: { cooked: string | null } }[];
}

interface Context {
	report: (descriptor: { node: Node; message: string }) => void;
}

const PLACEHOLDER = "x";

const templateText = (node: Node): string | undefined => {
	const parts = node.quasis?.map((quasi) => quasi.value.cooked);
	return parts?.includes(null) ? undefined : parts?.join(PLACEHOLDER);
};

export const internalPathNeedsTrailingSlash = {
	meta: { type: "problem", schema: [] },
	create(context: Context) {
		const check = (node: Node, text: string | undefined) => {
			if (text !== undefined && isUnslashedPagePath(text)) {
				context.report({ node, message: MESSAGE });
			}
		};
		return {
			Literal: (node: Node) => check(node, typeof node.value === "string" ? node.value : undefined),
			TemplateLiteral: (node: Node) => check(node, templateText(node)),
		};
	},
};

export default {
	meta: { name: "site" },
	rules: { "internal-path-needs-trailing-slash": internalPathNeedsTrailingSlash },
};
