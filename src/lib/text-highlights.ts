/**
 * Paints ranges of a textarea's text, which a textarea can't style itself. A mirror of the text, laid out exactly
 * like the textarea's, sits over it with transparent glyphs, so only the highlighted ranges show. The textarea stays
 * native: undo, paste, spellcheck and mobile keyboards are untouched.
 *
 * Each highlighted range is a `span[data-highlight]` listing its kinds ("cut", "cut sentence"), for the caller's CSS
 * to style with `[data-highlight~="cut"]`. A span may break across lines and segments; the piece where a span
 * begins also lists its kind in `data-highlight-start`. Text colour is transparent, so style backgrounds and
 * decorations only.
 *
 * The mirror holds one block per line and replaces only the lines that changed, so a keystroke in a long text
 * lays out one paragraph again rather than the whole text.
 */

export interface HighlightSpan {
	start: number;
	end: number;
}

export interface HighlightSegment extends HighlightSpan {
	kinds: string[];
	/** The kinds whose spans begin at this segment's start. */
	starts: string[];
}

export interface TextHighlights {
	/** Replaces the spans of one kind, leaving the other kinds' spans as they are. Offsets index the textarea's value. */
	paint(kind: string, spans: readonly HighlightSpan[]): void;
	/**
	 * Scrolls the textarea just far enough to show the first span of a kind, or to put its top at the top of a span
	 * taller than the textarea. A textarea can't scroll to a range itself, and browsers disagree on whether moving the
	 * selection does, so this measures the mirror's rendered span instead.
	 */
	reveal(kind: string): void;
}

export interface MirrorLine {
	text: string;
	/** Offsets within the line, so a line's key survives edits to the lines above it. */
	highlights: HighlightSegment[];
	key: string;
}

interface RenderedLine {
	key: string;
	element: HTMLElement;
}

const MIRRORED_PROPERTIES = [
	"box-sizing",
	"border-top-width",
	"border-right-width",
	"border-bottom-width",
	"border-left-width",
	"padding-top",
	"padding-bottom",
	"padding-left",
	"font-family",
	"font-size",
	"font-weight",
	"font-style",
	"font-stretch",
	"font-variant",
	"font-feature-settings",
	"font-variation-settings",
	"font-kerning",
	"line-height",
	"letter-spacing",
	"word-spacing",
	"tab-size",
	"text-transform",
	"text-rendering",
	"overflow-wrap",
	"word-break",
	"hyphens",
	"direction",
] as const;

// An empty line still takes its height in the textarea; a zero-width space gives its block the same line box.
const EMPTY_LINE_HOLDER = "\u200b";

export function attachTextHighlights(textarea: HTMLTextAreaElement): TextHighlights {
	const mirror = createMirror(textarea);
	const spansByKind = new Map<string, readonly HighlightSpan[]>();
	let rendered: RenderedLine[] = [];
	let paddingRight = 0;
	let frame = 0;

	function copyLayout() {
		const style = getComputedStyle(textarea);
		for (const property of MIRRORED_PROPERTIES) mirror.style.setProperty(property, style.getPropertyValue(property));
		paddingRight = parseFloat(style.paddingRight);
		render();
	}

	function fitScrollbar() {
		const style = getComputedStyle(textarea);
		const borders = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
		const scrollbar = textarea.offsetWidth - textarea.clientWidth - borders;
		mirror.style.paddingRight = `${paddingRight + scrollbar}px`;
	}

	function syncScroll() {
		mirror.scrollTop = textarea.scrollTop;
	}

	function render() {
		frame = 0;
		const segments = highlightSegments(spansByKind);
		if (segments.length === 0) {
			mirror.replaceChildren();
			rendered = [];
			return;
		}
		rendered = replaceChangedLines(mirror, rendered, mirrorLines(textarea.value, segments));
		fitScrollbar();
		syncScroll();
	}

	function renderNextFrame() {
		if (!frame) frame = requestAnimationFrame(render);
	}

	textarea.addEventListener("scroll", syncScroll);
	textarea.addEventListener("input", () => {
		if (spansByKind.size > 0) renderNextFrame();
	});
	new ResizeObserver(copyLayout).observe(textarea);
	void document.fonts.ready.then(copyLayout);
	copyLayout();

	function reveal(kind: string) {
		render();
		const span = mirror.querySelector(`[data-highlight~="${kind}"]`);
		if (!span) return;
		const view = textarea.getBoundingClientRect();
		const { top, bottom } = span.getBoundingClientRect();
		const margin = parseFloat(getComputedStyle(textarea).lineHeight) || 0;
		const hiddenAbove = view.top + margin - top;
		const hiddenBelow = bottom - (view.bottom - margin);
		if (hiddenAbove > 0 || bottom - top > view.height - 2 * margin) textarea.scrollTop -= hiddenAbove;
		else if (hiddenBelow > 0) textarea.scrollTop += hiddenBelow;
	}

	return {
		paint(kind, spans) {
			if (spans.length === 0) spansByKind.delete(kind);
			else spansByKind.set(kind, spans);
			renderNextFrame();
		},
		reveal,
	};
}

function createMirror(textarea: HTMLTextAreaElement): HTMLElement {
	const stack = document.createElement("div");
	Object.assign(stack.style, { display: "grid", position: "relative", minWidth: "0" });
	const mirror = document.createElement("div");
	mirror.setAttribute("aria-hidden", "true");
	Object.assign(mirror.style, {
		position: "absolute",
		inset: "0",
		margin: "0",
		overflow: "hidden",
		pointerEvents: "none",
		userSelect: "none",
		color: "transparent",
		whiteSpace: "pre-wrap",
		borderStyle: "solid",
		borderColor: "transparent",
	});
	textarea.before(stack);
	stack.append(textarea, mirror);
	return mirror;
}

/** Keeps the rendered lines shared at the start and end, and replaces the ones between them. */
function replaceChangedLines(mirror: HTMLElement, previous: RenderedLine[], next: MirrorLine[]): RenderedLine[] {
	let head = 0;
	while (head < previous.length && head < next.length && previous[head].key === next[head].key) head++;
	let tail = 0;
	while (
		tail < previous.length - head &&
		tail < next.length - head &&
		previous[previous.length - 1 - tail].key === next[next.length - 1 - tail].key
	)
		tail++;

	const kept = previous.length - tail;
	for (const { element } of previous.slice(head, kept)) element.remove();
	const fresh = next.slice(head, next.length - tail).map((line) => ({ key: line.key, element: lineElement(line) }));
	const after = previous[kept]?.element ?? null;
	for (const { element } of fresh) mirror.insertBefore(element, after);
	return [...previous.slice(0, head), ...fresh, ...previous.slice(kept)];
}

function lineElement({ text, highlights }: MirrorLine): HTMLElement {
	const line = document.createElement("div");
	if (text === "") {
		line.append(EMPTY_LINE_HOLDER);
		return line;
	}
	let shownUpTo = 0;
	for (const { start, end, kinds, starts } of highlights) {
		if (start > shownUpTo) line.append(text.slice(shownUpTo, start));
		const highlight = document.createElement("span");
		highlight.dataset.highlight = kinds.join(" ");
		if (starts.length > 0) highlight.dataset.highlightStart = starts.join(" ");
		highlight.textContent = text.slice(start, end);
		line.append(highlight);
		shownUpTo = end;
	}
	if (shownUpTo < text.length) line.append(text.slice(shownUpTo));
	return line;
}

/** Splits the text into lines, each with the parts of `segments` that fall on it. `segments` must be sorted and apart. */
export function mirrorLines(text: string, segments: readonly HighlightSegment[]): MirrorLine[] {
	const lines: MirrorLine[] = [];
	let firstOpen = 0;
	let lineStart = 0;
	for (const lineText of text.split("\n")) {
		const lineEnd = lineStart + lineText.length;
		while (firstOpen < segments.length && segments[firstOpen].end <= lineStart) firstOpen++;
		const highlights: HighlightSegment[] = [];
		for (let i = firstOpen; i < segments.length && segments[i].start < lineEnd; i++) {
			const segment = segments[i];
			const start = Math.max(segment.start, lineStart) - lineStart;
			const end = Math.min(segment.end, lineEnd) - lineStart;
			const starts = segment.start >= lineStart ? segment.starts : [];
			if (end > start) highlights.push({ start, end, kinds: segment.kinds, starts });
		}
		const highlightKey = highlights
			.map(({ start, end, kinds, starts }) => `${start}-${end}:${kinds.join(" ")}:${starts.join(" ")}`)
			.join(",");
		lines.push({ text: lineText, highlights, key: `${lineText}\n${highlightKey}` });
		lineStart = lineEnd + 1;
	}
	return lines;
}

/** Flattens possibly overlapping spans of several kinds into ordered, non-overlapping segments, each listing every kind that covers it. */
export function highlightSegments(spansByKind: ReadonlyMap<string, readonly HighlightSpan[]>): HighlightSegment[] {
	const edges: { at: number; kind: string; depth: 1 | -1 }[] = [];
	for (const [kind, spans] of spansByKind) {
		for (const { start, end } of spans) {
			if (end <= start) continue;
			edges.push({ at: start, kind, depth: 1 }, { at: end, kind, depth: -1 });
		}
	}
	edges.sort((a, b) => a.at - b.at);

	const segments: HighlightSegment[] = [];
	const openKinds = new Map<string, number>();
	let from = 0;
	let startsAtFrom: string[] = [];
	for (let i = 0; i < edges.length;) {
		const at = edges[i].at;
		if (at > from && openKinds.size > 0)
			addSegment(segments, { start: from, end: at, kinds: [...openKinds.keys()].sort(), starts: startsAtFrom });
		const openBefore = new Set(openKinds.keys());
		for (; i < edges.length && edges[i].at === at; i++) {
			const { kind, depth } = edges[i];
			const open = (openKinds.get(kind) ?? 0) + depth;
			if (open === 0) openKinds.delete(kind);
			else openKinds.set(kind, open);
		}
		from = at;
		startsAtFrom = [...openKinds.keys()].filter((kind) => !openBefore.has(kind)).sort();
	}
	return segments;
}

function addSegment(segments: HighlightSegment[], segment: HighlightSegment): void {
	const previous = segments.at(-1);
	const continuesPrevious =
		previous?.end === segment.start && segment.starts.length === 0 && previous.kinds.join() === segment.kinds.join();
	if (continuesPrevious) previous.end = segment.end;
	else segments.push(segment);
}
