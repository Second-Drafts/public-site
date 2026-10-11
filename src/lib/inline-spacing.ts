export const ADJACENT_TEXT_ATTRIBUTE = "data-adjacent-text";

const INLINE_TAG = /<(\/?)(a|abbr|b|cite|code|em|i|mark|q|small|strong)\b([^>]*)>/gi;
const SCRIPT_OR_STYLE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const WORD_CHARACTER = /[\p{L}\p{N}]/u;
const CONTEXT_LENGTH = 30;

interface OpenTag {
	name: string;
	exempt: boolean;
}

function touchesWord(character: string | undefined): boolean {
	return character !== undefined && WORD_CHARACTER.test(character);
}

function closeMatching(openTags: OpenTag[], name: string): OpenTag | undefined {
	const index = openTags.findLastIndex((tag) => tag.name === name);
	return index === -1 ? undefined : openTags.splice(index, 1)[0];
}

function visibleText(html: string): string {
	return html.replace(/<[^>]*>|^[^<]*>|<[^>]*$/g, "").replace(/\s+/g, " ");
}

function contextAround(source: string, start: number, end: number, tag: string): string {
	const before = visibleText(source.slice(Math.max(0, start - 200), start)).slice(-CONTEXT_LENGTH);
	const after = visibleText(source.slice(end, end + 200)).slice(0, CONTEXT_LENGTH);
	return `${before}${tag}${after}`.trim();
}

/** Text that touches an inline tag with no space between, usually because Astro dropped a line break. */
export function findCrampedInlineTags(html: string): string[] {
	const source = html.replace(SCRIPT_OR_STYLE, "");
	const openTags: OpenTag[] = [];
	const cramped: string[] = [];
	for (const match of source.matchAll(INLINE_TAG)) {
		const [markup, closing, rawName, attributes] = match;
		const name = rawName.toLowerCase();
		const start = match.index;
		const end = start + markup.length;
		if (closing) {
			const exempt = closeMatching(openTags, name)?.exempt ?? false;
			if (!exempt && touchesWord(source[end])) cramped.push(contextAround(source, start, end, `</${name}>`));
			continue;
		}
		const exempt = attributes.includes(ADJACENT_TEXT_ATTRIBUTE);
		openTags.push({ name, exempt });
		if (!exempt && touchesWord(source[start - 1])) cramped.push(contextAround(source, start, end, `<${name}>`));
	}
	return cramped;
}
