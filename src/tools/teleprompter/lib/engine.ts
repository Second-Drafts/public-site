/*
 * The Prompt view's scroll engine.
 *
 * The text lives in a native `overflow-y: auto` scroller, so wheel, trackpad and touch momentum come
 * free. Auto-scroll advances a float position by speed × real dt each frame. Browsers round scrollTop
 * to whole pixels, which visibly steps at slow speeds (8 px/s is one step every ~7 frames), so each
 * frame writes the whole part to scrollTop and the fractional remainder as a transform on the text:
 *
 *   scrollTop = floor(pos);  text.transform = translate3d(0, -(pos - floor(pos))px, 0)
 *
 * Positions are in "read" coordinates: pos 0 puts the top of the text on the read line, and a
 * paragraph's offsetTop inside the text element is the pos that puts it there. The scroller's CSS
 * padding makes scrollTop equal that pos.
 */

import { clamp } from "./math";

/** A backgrounded tab or a long GC pause must not make the text jump. */
export const MAX_DT_MS = 100;
/** A scrollTop this far from what we last wrote means the user moved it. */
export const MANUAL_SCROLL_THRESHOLD_PX = 1;
/** After the last user scroll event, wait this long before writing scrollTop again (iOS momentum). */
export const SCROLL_QUIET_MS = 150;
/** Within this distance of the end, playback counts as finished. */
export const END_EPSILON_PX = 0.5;
/** Paragraph jumps animate for this long, unless the reader asks for reduced motion. */
export const JUMP_MS = 180;

/**
 * Split a script into paragraphs on blank lines. Single line breaks stay inside a paragraph.
 * Whitespace-only lines count as blank. Empty input gives no paragraphs.
 */
export function splitParagraphs(script: string): string[] {
	return script
		.replace(/\r\n?/g, "\n")
		.split(/\n[ \t ]*\n/)
		.map((p) => p.replace(/^\n+/, "").replace(/\s+$/, ""))
		.filter((p) => p.trim().length > 0);
}

/** Frame delta in ms, clamped to [0, MAX_DT_MS]. */
export const clampDt = (dtMs: number) => (Number.isFinite(dtMs) ? clamp(dtMs, 0, MAX_DT_MS) : 0);

/**
 * One auto-scroll step. Returns the new position (never past max) and whether the end was reached.
 */
export function stepPosition(
	pos: number,
	pxPerSecond: number,
	dtMs: number,
	max: number,
): { pos: number; ended: boolean } {
	const next = Math.min(max, pos + (Math.max(0, pxPerSecond) * clampDt(dtMs)) / 1000);
	return { pos: next, ended: next >= max - END_EPSILON_PX };
}

/** Whole pixels for scrollTop and the sub-pixel remainder for the transform. frac is in [0, 1). */
export function splitPosition(pos: number): { top: number; frac: number } {
	const top = Math.floor(pos);
	return { top, frac: pos - top };
}

/**
 * Index of the paragraph at the read line: the last one whose top is at or above pos.
 * `offsets` are paragraph tops, ascending. Before the first paragraph → 0. No paragraphs → -1.
 */
export function paragraphIndexAt(offsets: readonly number[], pos: number): number {
	if (offsets.length === 0) return -1;
	// Half a pixel of slack so a paragraph we just jumped to counts as current despite rounding.
	const y = pos + 0.5;
	let lo = 0;
	let hi = offsets.length - 1;
	if (y < offsets[0]) return 0;
	while (lo < hi) {
		const mid = (lo + hi + 1) >> 1;
		if (offsets[mid] <= y) lo = mid;
		else hi = mid - 1;
	}
	return lo;
}

/**
 * Where a paragraph jump lands.
 * Forward: the next paragraph's top (or stay put if there is none).
 * Back: the current paragraph's top if the read line is more than `slack` px into it, so a reader
 * who lost their place mid-paragraph gets its start; otherwise the previous paragraph's top.
 */
export function paragraphTarget(
	offsets: readonly number[],
	pos: number,
	direction: 1 | -1,
	slack = 0,
): number {
	if (offsets.length === 0) return pos;
	const i = paragraphIndexAt(offsets, pos);
	if (direction === 1) {
		if (pos < offsets[0] - 0.5) return offsets[0];
		// paragraphIndexAt guarantees offsets[i + 1] (if any) is below the read line.
		return offsets[i + 1] ?? pos;
	}
	if (pos > offsets[i] + Math.max(slack, 0.5)) return offsets[i];
	return offsets[Math.max(0, i - 1)];
}

/** The reader's place, independent of layout: a paragraph and how far through it the read line is. */
export interface Anchor {
	index: number;
	/** 0 at the paragraph's top, 1 at the next paragraph's top. */
	ratio: number;
}

/**
 * `offsets` are paragraph tops; `end` is where the last paragraph's span ends (the text height).
 */
export function captureAnchor(offsets: readonly number[], end: number, pos: number): Anchor | null {
	if (offsets.length === 0) return null;
	const index = paragraphIndexAt(offsets, pos);
	const top = offsets[index];
	const span = (offsets[index + 1] ?? end) - top;
	const ratio = span > 0 ? clamp((pos - top) / span, 0, 1) : 0;
	return { index, ratio };
}

export function positionForAnchor(offsets: readonly number[], end: number, anchor: Anchor | null): number {
	if (!anchor || offsets.length === 0) return 0;
	const index = clamp(anchor.index, 0, offsets.length - 1);
	const top = offsets[index];
	const span = (offsets[index + 1] ?? end) - top;
	return top + anchor.ratio * Math.max(0, span);
}

/** Ease-out cubic: fast start, gentle landing. t in [0, 1]. */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

export interface EngineOptions {
	/** The overflow-y: auto element. */
	scroller: HTMLElement;
	/** The element that carries the sub-pixel transform; paragraphs' offsetTop is measured within it. */
	text: HTMLElement;
	/** Called once when auto-scroll reaches the end and stops itself. */
	onEnd(): void;
	/** Checked per jump, so a change in the OS setting applies at once. */
	reducedMotion(): boolean;
}

export interface ScrollEngine {
	/** Float position, px from the top of the text to the read line. */
	readonly position: number;
	readonly max: number;
	readonly playing: boolean;
	/** Remaining distance to the end, px. */
	remaining(): number;
	play(): void;
	pause(): void;
	setSpeed(pxPerSecond: number): void;
	/** Re-read paragraph offsets and the scroll range, keeping the reader's place. Call after layout changes. */
	relayout(): void;
	/** Move to a position. Animated unless `instant` or reduced motion. */
	scrollTo(pos: number, instant?: boolean): void;
	jumpParagraph(direction: 1 | -1, slack?: number): void;
	jumpToParagraph(index: number): void;
	/** Paragraph tops, for tests and the harness. */
	offsets(): readonly number[];
	/** True while a finger is down or for a short while after the user scrolled by hand (taps vs momentum stops). */
	recentlyScrolledByUser(): boolean;
}

export function createScrollEngine(options: EngineOptions): ScrollEngine {
	const { scroller, text, onEnd, reducedMotion } = options;

	let pos = 0;
	let max = 0;
	let textHeight = 0;
	let paragraphTops: number[] = [];
	let speed = 0;
	let playing = false;
	let lastWritten = 0;
	let lastFrac = -1;
	let frameId = 0;
	let lastTime: number | null = null;
	let touching = false;
	let userScrollAt = -Infinity;
	let jump: { from: number; to: number; start: number | null; duration: number } | null = null;

	const now = () => performance.now();

	function setFrac(frac: number) {
		// Round to 1/1000 px: below anything visible, and keeps the style string short.
		const f = Math.round(frac * 1000) / 1000;
		if (f === lastFrac) return;
		lastFrac = f;
		text.style.transform = f === 0 ? "" : `translate3d(0, ${-f}px, 0)`;
	}

	function write() {
		const { top, frac } = splitPosition(pos);
		if (scroller.scrollTop !== top) scroller.scrollTop = top;
		lastWritten = top;
		setFrac(frac);
	}

	/** Take whatever the user scrolled to as the new position. */
	function adopt() {
		pos = clamp(scroller.scrollTop, 0, max);
		lastWritten = scroller.scrollTop;
		setFrac(0);
	}

	const userActive = () => touching || now() - userScrollAt < SCROLL_QUIET_MS;

	/** Records a scroll the user made by hand since the last write. */
	function recordHandScroll(): boolean {
		if (Math.abs(scroller.scrollTop - lastWritten) <= MANUAL_SCROLL_THRESHOLD_PX) return false;
		userScrollAt = now();
		jump = null;
		return true;
	}

	function onScroll() {
		if (recordHandScroll()) adopt();
	}
	const onWheel = () => {
		userScrollAt = now();
		jump = null;
	};
	const onTouchStart = () => {
		touching = true;
	};
	const onTouchEnd = (event: TouchEvent) => {
		if (event.touches.length === 0) {
			touching = false;
			// Momentum may follow; its scroll events keep extending the quiet window.
			userScrollAt = Math.max(userScrollAt, now() - SCROLL_QUIET_MS / 2);
		}
	};

	scroller.addEventListener("scroll", onScroll, { passive: true });
	scroller.addEventListener("wheel", onWheel, { passive: true });
	scroller.addEventListener("touchstart", onTouchStart, { passive: true });
	scroller.addEventListener("touchend", onTouchEnd, { passive: true });
	scroller.addEventListener("touchcancel", onTouchEnd, { passive: true });

	function ensureLoop() {
		if (!frameId && (playing || jump)) {
			lastTime = null;
			frameId = requestAnimationFrame(frame);
		}
	}

	function frame(time: number) {
		frameId = 0;
		const dt = lastTime === null ? 0 : clampDt(time - lastTime);
		lastTime = time;

		// A scroll event may not have arrived yet for a gesture that already moved the scroller.
		recordHandScroll();

		if (userActive()) {
			// Never fight a finger or momentum: follow the scroller, write nothing.
			adopt();
		} else if (jump) {
			if (jump.start === null) jump.start = time;
			const t = jump.duration > 0 ? (time - jump.start) / jump.duration : 1;
			pos = jump.from + (jump.to - jump.from) * easeOutCubic(t);
			if (t >= 1) {
				pos = jump.to;
				jump = null;
			}
			write();
		} else if (playing) {
			const step = stepPosition(pos, speed, dt, max);
			pos = step.pos;
			write();
			if (step.ended) {
				pos = max;
				playing = false;
				onEnd();
			}
		}

		if (playing || jump) frameId = requestAnimationFrame(frame);
	}

	function measure() {
		const paragraphs = text.children;
		paragraphTops = [];
		for (let i = 0; i < paragraphs.length; i++) {
			paragraphTops.push((paragraphs[i] as HTMLElement).offsetTop);
		}
		textHeight = text.offsetHeight;
		max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
	}

	// No measure() here: the host mounts hidden, and its first relayout() measures.
	return {
		get position() {
			return pos;
		},
		get max() {
			return max;
		},
		get playing() {
			return playing;
		},
		remaining: () => Math.max(0, max - pos),
		play() {
			if (playing) return;
			playing = true;
			ensureLoop();
		},
		pause() {
			playing = false;
		},
		setSpeed(pxPerSecond) {
			speed = Math.max(0, pxPerSecond);
		},
		relayout() {
			const target = jump ? jump.to : pos;
			const anchor = captureAnchor(paragraphTops, textHeight, target);
			measure();
			jump = null;
			pos = clamp(positionForAnchor(paragraphTops, textHeight, anchor), 0, max);
			write();
		},
		scrollTo(target, instant = false) {
			const to = clamp(target, 0, max);
			if (instant || reducedMotion() || Math.abs(to - pos) < 1) {
				jump = null;
				pos = to;
				write();
				return;
			}
			jump = { from: pos, to, start: null, duration: JUMP_MS };
			userScrollAt = -Infinity;
			ensureLoop();
		},
		jumpParagraph(direction, slack = 0) {
			const from = jump ? jump.to : pos;
			this.scrollTo(paragraphTarget(paragraphTops, from, direction, slack));
		},
		jumpToParagraph(index) {
			if (index >= 0 && index < paragraphTops.length) this.scrollTo(paragraphTops[index]);
		},
		offsets: () => paragraphTops,
		recentlyScrolledByUser: userActive,
	};
}
