import { describe, expect, it } from "vitest";
import {
	END_EPSILON_PX,
	MAX_DT_MS,
	captureAnchor,
	clampDt,
	easeOutCubic,
	isDoubleTap,
	isTap,
	paragraphIndexAt,
	paragraphTarget,
	positionForAnchor,
	splitParagraphs,
	splitPosition,
	stepPosition,
} from "./engine";
import { actionForKey, isRepeatable, shortcutsFor } from "./keyboard";

describe("splitParagraphs", () => {
	it("splits on blank lines and keeps single line breaks", () => {
		expect(splitParagraphs("One\ntwo\n\nThree")).toEqual(["One\ntwo", "Three"]);
	});
	it("treats whitespace-only lines and runs of blank lines as one break", () => {
		expect(splitParagraphs("A\n  \t\nB\n\n\n\nC")).toEqual(["A", "B", "C"]);
	});
	it("normalises Windows and old Mac line endings", () => {
		expect(splitParagraphs("A\r\n\r\nB\rC")).toEqual(["A", "B\nC"]);
	});
	it("drops leading and trailing blank space", () => {
		expect(splitParagraphs("\n\n  Hello  \n\n")).toEqual(["  Hello"]);
	});
	it("returns nothing for empty or blank scripts", () => {
		expect(splitParagraphs("")).toEqual([]);
		expect(splitParagraphs(" \n \n ")).toEqual([]);
	});
	it("keeps markup-looking text as plain text", () => {
		expect(splitParagraphs("<img src=x onerror=alert(1)>")).toEqual(["<img src=x onerror=alert(1)>"]);
	});
});

describe("clampDt and stepPosition", () => {
	it("clamps frame deltas", () => {
		expect(clampDt(16.7)).toBeCloseTo(16.7);
		expect(clampDt(5000)).toBe(MAX_DT_MS);
		expect(clampDt(-3)).toBe(0);
		expect(clampDt(Number.NaN)).toBe(0);
	});
	it("advances by speed × dt with sub-pixel precision", () => {
		const { pos, ended } = stepPosition(10, 8, 16, 1000);
		expect(pos).toBeCloseTo(10.128, 6);
		expect(ended).toBe(false);
	});
	it("accumulates slow speeds without losing fractions", () => {
		let pos = 0;
		for (let i = 0; i < 60; i++) pos = stepPosition(pos, 8, 1000 / 60, 1000).pos;
		expect(pos).toBeCloseTo(8, 6);
	});
	it("does not jump after a long pause (backgrounded tab)", () => {
		expect(stepPosition(0, 100, 10_000, 1000).pos).toBeCloseTo(10, 6);
	});
	it("stops at max and reports the end within the epsilon", () => {
		expect(stepPosition(995, 1000, 100, 1000)).toEqual({ pos: 1000, ended: true });
		expect(stepPosition(1000 - END_EPSILON_PX - 0.01, 0, 16, 1000).ended).toBe(false);
		expect(stepPosition(1000 - END_EPSILON_PX, 0, 16, 1000).ended).toBe(true);
	});
	it("ignores negative speeds", () => {
		expect(stepPosition(5, -50, 16, 100).pos).toBe(5);
	});
});

describe("splitPosition", () => {
	it("splits into whole scrollTop and a fractional transform", () => {
		expect(splitPosition(12.75)).toEqual({ top: 12, frac: 0.75 });
		expect(splitPosition(3)).toEqual({ top: 3, frac: 0 });
	});
	it("recombines exactly", () => {
		for (const pos of [0, 0.1, 99.999, 1234.5678]) {
			const { top, frac } = splitPosition(pos);
			expect(top + frac).toBeCloseTo(pos, 9);
			expect(frac).toBeGreaterThanOrEqual(0);
			expect(frac).toBeLessThan(1);
		}
	});
});

const OFFSETS = [0, 200, 500, 900];

describe("paragraphIndexAt", () => {
	it("finds the paragraph at the read line", () => {
		expect(paragraphIndexAt(OFFSETS, 0)).toBe(0);
		expect(paragraphIndexAt(OFFSETS, 199)).toBe(0);
		expect(paragraphIndexAt(OFFSETS, 200)).toBe(1);
		expect(paragraphIndexAt(OFFSETS, 650)).toBe(2);
		expect(paragraphIndexAt(OFFSETS, 5000)).toBe(3);
	});
	it("counts a paragraph we just landed on despite rounding", () => {
		expect(paragraphIndexAt(OFFSETS, 199.7)).toBe(1);
	});
	it("handles edges", () => {
		expect(paragraphIndexAt([], 10)).toBe(-1);
		expect(paragraphIndexAt([50, 100], 0)).toBe(0);
	});
});

describe("paragraphTarget", () => {
	it("goes forward to the next paragraph's top", () => {
		expect(paragraphTarget(OFFSETS, 0, 1)).toBe(200);
		expect(paragraphTarget(OFFSETS, 250, 1)).toBe(500);
		expect(paragraphTarget(OFFSETS, 200, 1)).toBe(500);
	});
	it("stays put going forward from the last paragraph", () => {
		expect(paragraphTarget(OFFSETS, 950, 1)).toBe(950);
	});
	it("goes back to the previous paragraph from a paragraph's top", () => {
		expect(paragraphTarget(OFFSETS, 500, -1)).toBe(200);
		expect(paragraphTarget(OFFSETS, 0, -1)).toBe(0);
	});
	it("goes back to the current paragraph's top when well into it", () => {
		expect(paragraphTarget(OFFSETS, 650, -1, 84)).toBe(500);
	});
	it("goes back past the current paragraph when within the slack", () => {
		expect(paragraphTarget(OFFSETS, 550, -1, 84)).toBe(200);
	});
	it("chains: repeated jumps walk the list", () => {
		let pos = 0;
		const seen = [];
		for (let i = 0; i < 4; i++) seen.push((pos = paragraphTarget(OFFSETS, pos, 1)));
		expect(seen).toEqual([200, 500, 900, 900]);
		for (let i = 0; i < 4; i++) pos = paragraphTarget(OFFSETS, pos, -1);
		expect(pos).toBe(0);
	});
	it("returns the position unchanged without paragraphs", () => {
		expect(paragraphTarget([], 42, 1)).toBe(42);
	});
});

describe("anchors keep the reader's place across relayout", () => {
	it("captures paragraph and ratio", () => {
		expect(captureAnchor(OFFSETS, 1100, 350)).toEqual({ index: 1, ratio: 0.5 });
		expect(captureAnchor(OFFSETS, 1100, 1000)).toEqual({ index: 3, ratio: 0.5 });
		expect(captureAnchor([], 0, 10)).toBeNull();
	});
	it("maps to the same place in a scaled layout", () => {
		const anchor = captureAnchor(OFFSETS, 1100, 350);
		const bigger = OFFSETS.map((o) => o * 2);
		expect(positionForAnchor(bigger, 2200, anchor)).toBe(700);
	});
	it("maps to the same place when paragraphs reflow unevenly", () => {
		const anchor = captureAnchor(OFFSETS, 1100, 650); // 150/400 into paragraph 2
		expect(positionForAnchor([0, 300, 600, 1400], 1700, anchor)).toBe(600 + 0.375 * 800);
	});
	it("clamps an anchor whose paragraph no longer exists", () => {
		expect(positionForAnchor([0, 100], 300, { index: 7, ratio: 0 })).toBe(100);
		expect(positionForAnchor([0, 100], 300, null)).toBe(0);
	});
});

describe("gestures", () => {
	it("a short still press is a tap", () => {
		expect(isTap(2, 3, 120)).toBe(true);
	});
	it("movement or a long hold is not a tap", () => {
		expect(isTap(0, 12, 100)).toBe(false);
		expect(isTap(7, 8, 100)).toBe(false);
		expect(isTap(0, 0, 900)).toBe(false);
	});
	it("detects double taps close in time and space", () => {
		const first = { t: 1000, x: 100, y: 100 };
		expect(isDoubleTap(null, first)).toBe(false);
		expect(isDoubleTap(first, { t: 1250, x: 110, y: 105 })).toBe(true);
		expect(isDoubleTap(first, { t: 1500, x: 100, y: 100 })).toBe(false);
		expect(isDoubleTap(first, { t: 1100, x: 200, y: 100 })).toBe(false);
	});
	it("eases out from 0 to 1", () => {
		expect(easeOutCubic(0)).toBe(0);
		expect(easeOutCubic(1)).toBe(1);
		expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
		expect(easeOutCubic(2)).toBe(1);
	});
});

describe("keyboard", () => {
	it("maps the shortcut table with the default (paragraphs) arrow layout", () => {
		const map = (key: string) => actionForKey({ key });
		expect(map(" ")).toBe("toggle");
		expect(map("ArrowRight")).toBe("speedUp");
		expect(map("ArrowLeft")).toBe("speedDown");
		expect(map("ArrowUp")).toBe("previousParagraph");
		expect(map("ArrowDown")).toBe("nextParagraph");
		expect(map("PageUp")).toBe("previousParagraph");
		expect(map("PageDown")).toBe("nextParagraph");
		expect(map("Home")).toBe("top");
		expect(map("f")).toBe("fullscreen");
		expect(map("F")).toBe("fullscreen");
		expect(map("m")).toBe("mirror");
		expect(map("M")).toBe("mirror");
		expect(map("s")).toBe("settings");
		expect(map("S")).toBe("settings");
		expect(map("Escape")).toBe("exit");
	});
	it("matches the explicit paragraphs layout to the default", () => {
		for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", " ", "Home"]) {
			expect(actionForKey({ key }, "paragraphs")).toBe(actionForKey({ key }));
		}
	});
	it("puts speed on up/down and paragraphs on left/right in the speed layout", () => {
		const map = (key: string) => actionForKey({ key }, "speed");
		expect(map("ArrowUp")).toBe("speedUp");
		expect(map("ArrowDown")).toBe("speedDown");
		expect(map("ArrowLeft")).toBe("previousParagraph");
		expect(map("ArrowRight")).toBe("nextParagraph");
		expect(map(" ")).toBe("toggle");
		expect(map("Escape")).toBe("exit");
	});
	it.each(["paragraphs", "speed"] as const)("keeps PageUp / PageDown on paragraphs in the %s layout", (layout) => {
		expect(actionForKey({ key: "PageUp" }, layout)).toBe("previousParagraph");
		expect(actionForKey({ key: "PageDown" }, layout)).toBe("nextParagraph");
	});
	it("leaves other keys and modified shortcuts to the browser", () => {
		expect(actionForKey({ key: "Tab" })).toBeNull();
		expect(actionForKey({ key: "Enter" })).toBeNull();
		// Legacy IE / old Edge key names aren't mapped.
		for (const key of ["Spacebar", "Esc", "Up", "Down", "Left", "Right"]) expect(actionForKey({ key })).toBeNull();
		expect(actionForKey({ key: "f", metaKey: true })).toBeNull();
		expect(actionForKey({ key: "ArrowLeft", altKey: true })).toBeNull();
		expect(actionForKey({ key: "m", ctrlKey: true })).toBeNull();
		expect(actionForKey({ key: "s", metaKey: true })).toBeNull();
	});
	it.each(["paragraphs", "speed"] as const)("labels the hint rows by what the keys do in the %s layout", (layout) => {
		const rows = shortcutsFor(layout);
		const label = (id: string) => rows.find((row) => row.id === id)?.label;
		// The arrow rows' labels match what their first key does in this layout.
		const does = (key: string) => actionForKey({ key }, layout);
		expect(label("vertical")).toBe(does("ArrowUp") === "previousParagraph" ? "Previous or next paragraph" : "Faster or slower");
		expect(label("horizontal")).toBe(does("ArrowLeft") === "previousParagraph" ? "Previous or next paragraph" : "Slower or faster");
		expect(actionForKey({ key: rows.find((row) => row.id === "settings")!.keys }, layout)).toBe("settings");
		// Same rows in the same order either way, so the card can relabel in place.
		expect(rows.map((row) => row.id)).toEqual(shortcutsFor().map((row) => row.id));
	});
	it("defaults the hint rows to the paragraphs layout", () => {
		expect(shortcutsFor()).toEqual(shortcutsFor("paragraphs"));
		expect(shortcutsFor("speed").find((row) => row.id === "vertical")?.label).toBe("Faster or slower");
	});
	it("only lets speed and paragraph keys auto-repeat", () => {
		expect(isRepeatable("speedUp")).toBe(true);
		expect(isRepeatable("nextParagraph")).toBe(true);
		expect(isRepeatable("toggle")).toBe(false);
		expect(isRepeatable("mirror")).toBe(false);
		expect(isRepeatable("settings")).toBe(false);
	});
});
