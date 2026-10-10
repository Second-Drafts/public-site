import { actionForKey, isRepeatable } from "./lib/keyboard";
import type { PromptAction } from "./lib/keyboard";
import type { ArrowKeyLayout } from "./lib/settings";

export interface PromptKeyOptions {
	arrowKeys(): ArrowKeyLayout;
	drawerIsOpen(): boolean;
	closeDrawer(): void;
	run(action: PromptAction): void;
}

// Capture phase on window, so a mapped key is ours whatever has focus: Space never presses the focused
// button, and arrows on the speed slider don't also nudge it.
export function listenForPromptKeys(options: PromptKeyOptions): () => void {
	function onKeyDown(event: KeyboardEvent) {
		if (event.isComposing || modalDialogHasKeys(event)) return;
		const action = actionForKey(event, options.arrowKeys());
		if (options.drawerIsOpen()) {
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

function modalDialogHasKeys(event: KeyboardEvent): boolean {
	return (
		document.querySelector("dialog[open]") !== null ||
		(event.target instanceof Element && event.target.closest("dialog") !== null)
	);
}
