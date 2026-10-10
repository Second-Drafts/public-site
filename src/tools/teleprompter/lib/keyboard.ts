import type { ArrowKeyLayout } from "./settings";

export type PromptAction =
	| "toggle"
	| "speedUp"
	| "speedDown"
	| "previousParagraph"
	| "nextParagraph"
	| "top"
	| "fullscreen"
	| "mirror"
	| "settings"
	| "exit";

export interface KeyLike {
	key: string;
	ctrlKey?: boolean;
	metaKey?: boolean;
	altKey?: boolean;
}

const KEYMAP: Record<string, PromptAction> = {
	" ": "toggle",
	PageUp: "previousParagraph",
	PageDown: "nextParagraph",
	Home: "top",
	f: "fullscreen",
	F: "fullscreen",
	m: "mirror",
	M: "mirror",
	s: "settings",
	S: "settings",
	Escape: "exit",
};

type ArrowPair = readonly [PromptAction, PromptAction];
const PREVIOUS_NEXT: ArrowPair = ["previousParagraph", "nextParagraph"];

const ARROWS: Record<ArrowKeyLayout, { vertical: ArrowPair; horizontal: ArrowPair }> = {
	paragraphs: { vertical: PREVIOUS_NEXT, horizontal: ["speedDown", "speedUp"] },
	speed: { vertical: ["speedUp", "speedDown"], horizontal: PREVIOUS_NEXT },
};

const ARROW_SLOTS: Record<string, readonly ["vertical" | "horizontal", 0 | 1]> = {
	ArrowUp: ["vertical", 0],
	ArrowDown: ["vertical", 1],
	ArrowLeft: ["horizontal", 0],
	ArrowRight: ["horizontal", 1],
};

export function actionForKey(event: KeyLike, layout: ArrowKeyLayout = "paragraphs"): PromptAction | null {
	if (event.ctrlKey || event.metaKey || event.altKey) return null;
	const slot = ARROW_SLOTS[event.key];
	if (slot) return ARROWS[layout][slot[0]][slot[1]];
	return KEYMAP[event.key] ?? null;
}

const REPEATABLE: ReadonlySet<PromptAction> = new Set([
	"speedUp",
	"speedDown",
	"previousParagraph",
	"nextParagraph",
]);

export const isRepeatable = (action: PromptAction) => REPEATABLE.has(action);

export interface Shortcut {
	id: "toggle" | "vertical" | "horizontal" | "top" | "fullscreen" | "mirror" | "settings" | "exit";
	keys: string;
	label: string;
}

const PARAGRAPH_LABEL = "Previous or next paragraph";

export function shortcutsFor(layout: ArrowKeyLayout = "paragraphs"): readonly Shortcut[] {
	const speedOnVertical = layout === "speed";
	return [
		{ id: "toggle", keys: "Space", label: "Play or pause" },
		{ id: "vertical", keys: "↑ ↓", label: speedOnVertical ? "Faster or slower" : PARAGRAPH_LABEL },
		{ id: "horizontal", keys: "← →", label: speedOnVertical ? PARAGRAPH_LABEL : "Slower or faster" },
		{ id: "top", keys: "Home", label: "Back to the top" },
		{ id: "fullscreen", keys: "F", label: "Full screen" },
		{ id: "mirror", keys: "M", label: "Mirror" },
		{ id: "settings", keys: "S", label: "Settings" },
		{ id: "exit", keys: "Esc", label: "Back to editing" },
	];
}

export const TOUCH_HINT = "Tap the words to play or pause. Drag to move. Double-tap a paragraph to jump to it.";

export function isTouchOnly(matches: (query: string) => boolean): boolean {
	return matches("(pointer: coarse)") && !matches("(any-pointer: fine)");
}
