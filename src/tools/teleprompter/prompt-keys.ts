import { actionForKey, isRepeatable } from "./lib/keyboard";
import type { PromptAction } from "./lib/keyboard";
import type { ArrowKeyLayout } from "./lib/settings";

export interface PromptKeyOptions {
	arrowKeys(): ArrowKeyLayout;
	drawerIsOpen(): boolean;
	closeDrawer(): void;
	run(action: PromptAction): void;
}

/**
 * Keys are handled on window in the capture phase, before any focused control sees them. Every key
 * we map is ours, whatever has focus: Space is always play/pause (never "press the focused button"),
 * and arrows/Home/PageUp/PageDown on the focused speed slider do the prompter action instead of also
 * nudging the slider, so nothing double-steps. Tab, Enter and End keep their native behaviour. In
 * browser fullscreen the first Esc is consumed by the browser to leave fullscreen and never reaches
 * the page; a second Esc exits Prompt view.
 *
 * Returns a function that stops listening.
 */
export function listenForPromptKeys(options: PromptKeyOptions): () => void {
	function onKeyDown(event: KeyboardEvent) {
		if (event.isComposing || modalDialogHasKeys(event)) return;
		// Read the layout at keypress time, so a change in the drawer applies to the very next key.
		const action = actionForKey(event, options.arrowKeys());
		if (options.drawerIsOpen()) {
			// Shortcuts are off: arrows, Space and letters belong to the focused control. Esc closes the drawer.
			if (action === "exit") {
				claim(event);
				options.closeDrawer();
			}
			return;
		}
		if (!action) return;
		claim(event);
		if (event.repeat && !isRepeatable(action)) return;
		options.run(action);
	}

	function onKeyUp(event: KeyboardEvent) {
		if (options.drawerIsOpen() || modalDialogHasKeys(event)) return;
		// Firefox activates a focused button on Space keyup; Space already toggled playback on keydown.
		if (actionForKey(event, options.arrowKeys()) === "toggle") event.preventDefault();
	}

	window.addEventListener("keydown", onKeyDown, true);
	window.addEventListener("keyup", onKeyUp, true);
	return () => {
		window.removeEventListener("keydown", onKeyDown, true);
		window.removeEventListener("keyup", onKeyUp, true);
	};
}

function claim(event: KeyboardEvent) {
	event.preventDefault();
	event.stopPropagation();
}

/** A native modal (the Reset confirm, opened from the drawer) owns every key, so Esc closes it, not the drawer. */
function modalDialogHasKeys(event: KeyboardEvent): boolean {
	return (
		document.querySelector("dialog[open]") !== null ||
		(event.target instanceof Element && event.target.closest("dialog") !== null)
	);
}
