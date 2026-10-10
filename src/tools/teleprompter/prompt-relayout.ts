import type { ScrollEngine } from "./lib/engine";

export interface Relayout {
	/** Re-measure now, keeping the reader's place (same paragraph, same offset at the read line). */
	now(): void;
	/** At most one relayout per frame, however many requests arrive. */
	request(): void;
	/** Relayout once `font` has loaded, if still following. The same promise twice is waited on once. */
	afterFontLoads(font: Promise<void>): void;
	/** Follow resizes and font loads. */
	follow(): void;
	/** Stop following, and drop any requested relayout. */
	stop(): void;
}

/** `onRelayout` runs after every relayout. */
export function createRelayout(
	engine: Pick<ScrollEngine, "relayout">,
	scroller: HTMLElement,
	text: HTMLElement,
	onRelayout: () => void,
): Relayout {
	let following = false;
	let frame = 0;
	let measuredSizes = "";
	let awaitedFont: Promise<void> | null = null;

	const sizes = () => `${scroller.clientWidth}x${scroller.clientHeight} ${text.offsetWidth}x${text.offsetHeight}`;

	function now() {
		cancelAnimationFrame(frame);
		frame = 0;
		engine.relayout();
		measuredSizes = sizes();
		onRelayout();
	}

	function request() {
		if (!frame) frame = requestAnimationFrame(now);
	}

	function afterFontLoads(font: Promise<void>) {
		if (font === awaitedFont) return;
		awaitedFont = font;
		void font.then(() => {
			if (following) request();
		});
	}

	// A resize the last relayout already measured (e.g. a font-size change) is skipped. A new one (the
	// window, the drawer) relayouts at once, before this frame paints.
	const resizeObserver = new ResizeObserver(() => {
		if (following && sizes() !== measuredSizes) now();
	});

	function follow() {
		following = true;
		resizeObserver.observe(scroller);
		resizeObserver.observe(text);
	}

	function stop() {
		following = false;
		cancelAnimationFrame(frame);
		frame = 0;
		resizeObserver.disconnect();
	}

	return { now, request, afterFontLoads, follow, stop };
}
