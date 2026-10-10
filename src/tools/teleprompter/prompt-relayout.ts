import type { ScrollEngine } from "./lib/engine";

export interface Relayout {
	now(): void;
	request(): void;
	afterFontLoads(font: Promise<void>): void;
	follow(): void;
	stop(): void;
}

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
