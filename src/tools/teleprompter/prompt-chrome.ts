const HIDE_AFTER_MS = 2500;
/** Smaller pointer moves don't wake the toolbar (some browsers send stray moves on scroll). */
const WAKE_DISTANCE_PX = 3;

export interface ChromeAutoHide {
	/** Show the toolbar now, and fade it after a quiet spell if `canHide` allows. */
	show(): void;
	/** Show the toolbar and forget any pending fade. */
	reset(): void;
}

/** Presses on `root`, mouse moves over it and focus in `chrome` wake the toolbar. */
export function createChromeAutoHide(root: HTMLElement, chrome: HTMLElement, canHide: () => boolean): ChromeAutoHide {
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let lastPointer = { x: 0, y: 0 };

	function show() {
		if (root.dataset.chrome !== "shown") root.dataset.chrome = "shown";
		clearTimeout(hideTimer);
		if (!canHide()) return;
		hideTimer = setTimeout(() => {
			if (canHide()) root.dataset.chrome = "hidden";
		}, HIDE_AFTER_MS);
	}

	function reset() {
		clearTimeout(hideTimer);
		root.dataset.chrome = "shown";
	}

	function onPointerMove(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		if (Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) < WAKE_DISTANCE_PX) return;
		lastPointer = { x: event.clientX, y: event.clientY };
		show();
	}

	root.addEventListener("pointermove", onPointerMove, { passive: true });
	root.addEventListener("pointerdown", show, { passive: true });
	chrome.addEventListener("focusin", show);
	return { show, reset };
}
