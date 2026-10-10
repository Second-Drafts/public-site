import { required } from "./lib/dom";
import { isTouchOnly, shortcutsFor } from "./lib/keyboard";
import type { ArrowKeyLayout } from "./lib/settings";
import { KEYS, read, write } from "./lib/storage";

export interface ShortcutHint {
	show(options: { canFullscreen: boolean }): void;
	dismiss(): void;
	relabel(layout: ArrowKeyLayout): void;
}

export function createShortcutHint(hint: HTMLElement, focusAfterDismiss: HTMLElement): ShortcutHint {
	const part = (name: string) => required(hint, `[data-tpp="${name}"]`);
	const keyList = part("hint-keys");
	const touchHint = part("hint-touch");
	const fullscreenNote = part("fs-note");
	const fullscreenRow = hint.querySelector<HTMLElement>('[data-shortcut="fullscreen"]');

	function show({ canFullscreen }: { canFullscreen: boolean }) {
		fullscreenNote.hidden = canFullscreen;
		if (fullscreenRow) fullscreenRow.hidden = !canFullscreen;
		const touchOnly = isTouchOnly((query) => window.matchMedia(query).matches);
		keyList.hidden = touchOnly;
		touchHint.hidden = !touchOnly;
		hint.hidden = read(KEYS.hintSeen) !== null;
	}

	function dismiss() {
		if (hint.hidden) return;
		const hadFocus = hint.contains(document.activeElement);
		hint.hidden = true;
		write(KEYS.hintSeen, "1");
		if (hadFocus) focusAfterDismiss.focus({ preventScroll: true });
	}

	function relabel(layout: ArrowKeyLayout) {
		for (const shortcut of shortcutsFor(layout)) {
			const label = hint.querySelector(`[data-shortcut="${shortcut.id}"] [data-shortcut-label]`);
			if (label && label.textContent !== shortcut.label) label.textContent = shortcut.label;
		}
	}

	part("hint-dismiss").addEventListener("click", dismiss);
	return { show, dismiss, relabel };
}
