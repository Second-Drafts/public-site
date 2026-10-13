import { debounce } from "../../lib/debounce";
import { required } from "../../lib/dom";
import { sentences as splitSentences, type Sentence } from "../../lib/text/sentences";
import type { Editor } from "./editor";
import type { Store } from "./lib/state";
import {
	barAt,
	rhythmSummaryText,
	sentenceDescription,
	stripGeometry,
	summarizeRhythm,
	type StripGeometry,
} from "./lib/rhythm";
import type { UsageHooks } from "./usage-tracking";

const SETTLE_MS = 300;

export function mountRhythmView(store: Store, { textarea, highlights }: Editor, usage: UsageHooks): void {
	const summary = required(document, "#da-rhythm-summary");
	const strip = required(document, "#da-rhythm-strip");
	const detail = required(document, "#da-rhythm-detail");
	const cursor = required(document, ".da-rhythm__cursor");
	const svg = required<SVGSVGElement>(strip, "svg");
	const [barsPath, longBarsPath, longMarksPath] = Array.from(svg.querySelectorAll("path"));
	const thresholdLine = required<SVGLineElement>(svg, "line");

	let measuredText: string | null = null;
	let measured: Sentence[] = [];
	let cursorIndex: number | null = null;

	function measure() {
		const { text } = store.get();
		if (text === measuredText) return;
		measuredText = text;
		measured = splitSentences(text);
		cursorIndex = null;
		summary.textContent = rhythmSummaryText(summarizeRhythm(measured));
		drawBars(stripGeometry(measured));
		showCursor();
	}

	function drawBars({ width, height, bars, longBars, longMarks, thresholdY }: StripGeometry) {
		svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
		barsPath.setAttribute("d", bars);
		longBarsPath.setAttribute("d", longBars);
		longMarksPath.setAttribute("d", longMarks);
		thresholdLine.style.display = thresholdY === null ? "none" : "";
		if (thresholdY !== null) {
			thresholdLine.setAttribute("y1", String(thresholdY));
			thresholdLine.setAttribute("y2", String(thresholdY));
		}
	}

	function showCursor() {
		cursor.hidden = cursorIndex === null;
		if (cursorIndex === null) {
			detail.textContent = "";
			return;
		}
		cursor.style.left = `${(cursorIndex / measured.length) * 100}%`;
		cursor.style.width = `${100 / measured.length}%`;
		detail.textContent = sentenceDescription(measuredText ?? "", measured, cursorIndex);
	}

	function moveCursorTo(index: number) {
		if (measured.length === 0 || index === cursorIndex) return;
		cursorIndex = index;
		showCursor();
	}

	function selectSentence(index: number) {
		if (measuredText !== store.get().text) return;
		const sentence = measured[index];
		if (!sentence) return;
		highlights.paint("sentence", [sentence]);
		textarea.focus({ preventScroll: true });
		textarea.setSelectionRange(sentence.start, sentence.end);
		highlights.reveal("sentence");
		usage.onRhythmSentenceClicked();
	}

	function barUnder(event: PointerEvent): number {
		const { left, width } = strip.getBoundingClientRect();
		return barAt((event.clientX - left) / width, measured.length);
	}

	const measureWhenSettled = debounce(measure, SETTLE_MS);

	strip.addEventListener("pointermove", (event) => moveCursorTo(barUnder(event)));
	strip.addEventListener("click", (event) => {
		const index = barUnder(event as PointerEvent);
		moveCursorTo(index);
		selectSentence(index);
	});
	strip.addEventListener("keydown", (event) => {
		const last = measured.length - 1;
		const current = cursorIndex ?? -1;
		const target: Record<string, number> = {
			ArrowLeft: Math.max(0, current - 1),
			ArrowRight: Math.min(last, current + 1),
			Home: 0,
			End: last,
		};
		if (event.key in target) {
			event.preventDefault();
			moveCursorTo(target[event.key]);
		} else if ((event.key === "Enter" || event.key === " ") && cursorIndex !== null) {
			event.preventDefault();
			selectSentence(cursorIndex);
		}
	});

	measure();
	store.subscribe((state, previous) => {
		if (state.text === previous.text) return;
		highlights.paint("sentence", []);
		measureWhenSettled();
	});
}
