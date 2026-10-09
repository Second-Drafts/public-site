/*
 * Prompt view: renders the script for reading and drives playback.
 *
 * Entering and leaving follow the store (view "prompt" / "edit"). Every settings change made here
 * (speed, mirror, text size) goes through store.set so it persists, and comes back through the
 * subscription to be drawn, the same as changes made in the settings panel.
 *
 * The script is untrusted (it can arrive in a share link), so it is only ever set with textContent.
 */
import { required } from "./lib/dom";
import { createScrollEngine, isDoubleTap, isTap } from "./lib/engine";
import type { ScrollEngine } from "./lib/engine";
import { actionForKey, isRepeatable, isTouchOnly, shortcutsFor } from "./lib/keyboard";
import type { PromptAction } from "./lib/keyboard";
import {
	createWakeLock,
	exitFullscreen,
	fullscreenElement,
	fullscreenSupported,
	onFullscreenChange,
	toggleFullscreen,
} from "./lib/platform";
import { clamp } from "./lib/math";
import { LIMITS } from "./lib/settings";
import type { Settings } from "./lib/settings";
import { pixelsPerSecond } from "./lib/speed";
import { KEYS, read, write } from "./lib/storage";
import type { State, Store } from "./lib/store";
import { resolveTheme, siteThemeFor } from "./lib/themes";
import { formatClock, remainingSeconds } from "./lib/timing";
import { createStage } from "./stage";

export interface PromptHooks {
	/**
	 * Each time the reader starts scrolling from paused (after any countdown). Not when a double tap
	 * puts back the playback its first tap paused: that is a seek, not a play.
	 */
	onPlay(): void;
	/** Auto-paused because the end was reached. */
	onReachedEnd(): void;
}

declare global {
	interface Window {
		/** Dev only: the live engine, for browser-automation checks. */
		__tpPrompt?: { engine: ScrollEngine; root: HTMLElement };
	}
}

/** While playing, the toolbar fades after this long without pointer movement. */
const HIDE_CHROME_MS = 2500;
const COUNTDOWN_FROM = 3;
const TIMER_REFRESH_MS = 250;
/** Text size buttons move in bigger steps than the settings slider; 24–120 px in 24 presses. */
const FONT_STEP = LIMITS.fontSize.step * 2;
/** Pointer movement smaller than this doesn't wake the toolbar (some browsers send stray moves on scroll). */
const POINTER_WAKE_PX = 3;

const LAYOUT_KEYS = ["font", "bold", "theme", "fontSize", "lineHeight", "columnWidth", "align", "guidePosition"] as const;

export function mountPromptView(store: Store, hooks: PromptHooks): void {
	const mountPoint = document.querySelector<HTMLElement>("[data-tp-prompt]");
	if (!mountPoint) return;
	const root: HTMLElement = mountPoint;
	const el = <T extends HTMLElement = HTMLElement>(name: string) => required<T>(root, `[data-tpp="${name}"]`);

	const stage = createStage(required(root, "[data-tp-stage]"), { emptyMessage: "There's no script yet. Press Escape and paste one in." });
	const { scroller, text } = stage;
	const count = el("count");
	const hint = el("hint");
	const fsNote = el("fs-note");
	const hintKeys = el("hint-keys");
	const hintTouch = el("hint-touch");
	const status = el("status");
	const chrome = el("chrome");
	const playButton = el<HTMLButtonElement>("play");
	const playLabel = el("play-label");
	const slower = el<HTMLButtonElement>("slower");
	const faster = el<HTMLButtonElement>("faster");
	const speedInput = el<HTMLInputElement>("speed");
	const speedValue = el("speed-value");
	const smaller = el<HTMLButtonElement>("smaller");
	const larger = el<HTMLButtonElement>("larger");
	const topButton = el<HTMLButtonElement>("top");
	const elapsedOut = el("elapsed");
	const remainingOut = el("remaining");
	const mirrorButton = el<HTMLButtonElement>("mirror");
	const fsButton = el<HTMLButtonElement>("fullscreen");
	const exitButton = el<HTMLButtonElement>("exit");
	const settingsButton = el<HTMLButtonElement>("settings");
	const drawer = el("drawer");

	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const wakeLock = createWakeLock();

	let open = false;
	let countdownTimer: ReturnType<typeof setInterval> | undefined;
	let countdownValue = 0;
	let elapsedMs = 0;
	let playingSince: number | null = null;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let relayoutFrame = 0;
	/** Scroller and text sizes at the last relayout, so a ResizeObserver report of the same sizes is skipped. */
	let measuredSizes = "";
	/** The font load last waited on; stage.apply hands back the same promise while the font is unchanged. */
	let awaitedFont: Promise<void> | null = null;
	let restoreFocus: HTMLElement | null = null;
	let inerted: HTMLElement[] = [];
	let stopFullscreenWatch: (() => void) | null = null;
	let drawerOpen = false;

	const settings = () => store.get().settings;
	const lineHeightPx = () => settings().fontSize * settings().lineHeight;
	const speedPx = (s: Settings = settings()) => pixelsPerSecond(s.speed, s.fontSize, s.lineHeight);

	const engine = createScrollEngine({
		scroller,
		text,
		onEnd: handleEnd,
		reducedMotion: () => reduceMotion.matches,
	});
	if (import.meta.env.DEV) window.__tpPrompt = { engine, root };

	// ---- Relayout ------------------------------------------------------------------------

	const sizes = () => `${scroller.clientWidth}x${scroller.clientHeight} ${text.offsetWidth}x${text.offsetHeight}`;

	/** Re-measure now, keeping the reader's place (same paragraph, same offset at the read line). */
	function relayoutNow() {
		cancelAnimationFrame(relayoutFrame);
		relayoutFrame = 0;
		engine.relayout();
		measuredSizes = sizes();
		refreshTimers();
	}

	/** Settings, script and font changes: at most one relayout per frame, however many arrive. */
	function requestRelayout() {
		if (!relayoutFrame) relayoutFrame = requestAnimationFrame(relayoutNow);
	}

	// A resize the last relayout already measured (e.g. a font-size change) is skipped. A new one (the
	// window, the drawer) relayouts at once, before this frame paints.
	const resizeObserver = new ResizeObserver(() => {
		if (open && sizes() !== measuredSizes) relayoutNow();
	});

	// ---- Rendering ------------------------------------------------------------------------

	function renderSettings(s: Settings, previous: Settings | null) {
		const fontReady = stage.apply(s);
		// The chrome takes the theme's colours too, and native controls (the speed slider) its lightness.
		const theme = resolveTheme(s);
		root.style.setProperty("--tp-fg", theme.text);
		root.style.setProperty("--tp-bg", theme.background);
		const siteTheme = siteThemeFor(theme.background);
		root.style.colorScheme = siteTheme;
		// The drawer uses the site's tokens: Paper over a light prompter, Night shift over a dark one.
		if (drawer.dataset.theme !== siteTheme) drawer.dataset.theme = siteTheme;
		// The bottom sheet stops short of the read line (see .tpp-drawer).
		root.style.setProperty("--tpp-guide-pos", String(s.guidePosition));
		root.style.setProperty("--tpp-line", `${s.fontSize * s.lineHeight}px`);

		speedInput.value = String(s.speed);
		speedInput.setAttribute("aria-valuetext", `Speed ${s.speed} of ${LIMITS.speed.max}`);
		speedValue.textContent = String(s.speed);
		setDisabled(slower, s.speed <= LIMITS.speed.min);
		setDisabled(faster, s.speed >= LIMITS.speed.max);
		setDisabled(smaller, s.fontSize <= LIMITS.fontSize.min);
		setDisabled(larger, s.fontSize >= LIMITS.fontSize.max);
		mirrorButton.setAttribute("aria-pressed", String(s.mirror));
		if (!previous || s.arrowKeys !== previous.arrowKeys) renderShortcutHint(s.arrowKeys);
		engine.setSpeed(speedPx(s));

		if (!previous || LAYOUT_KEYS.some((key) => s[key] !== previous[key])) requestRelayout();
		if (fontReady !== awaitedFont) {
			awaitedFont = fontReady;
			void fontReady.then(() => {
				if (open) requestRelayout();
			});
		}
	}

	/** The hint card's arrow rows follow the arrow-key layout. Rendered with the default; relabelled here. */
	function renderShortcutHint(layout: Settings["arrowKeys"]) {
		for (const shortcut of shortcutsFor(layout)) {
			const label = hint.querySelector(`[data-shortcut="${shortcut.id}"] [data-shortcut-label]`);
			if (label && label.textContent !== shortcut.label) label.textContent = shortcut.label;
		}
	}

	/** aria-disabled, not disabled, so a focused button keeps focus when it reaches its limit. */
	function setDisabled(button: HTMLButtonElement, disabled: boolean) {
		button.setAttribute("aria-disabled", String(disabled));
	}

	type PlayState = "paused" | "counting" | "playing";
	const playState = (): PlayState => (countdownTimer ? "counting" : engine.playing ? "playing" : "paused");

	function renderPlayState() {
		const state = playState();
		root.dataset.state = state;
		playLabel.textContent = state === "paused" ? "Play" : "Pause";
	}

	function refreshTimers() {
		const elapsed = elapsedMs + (playingSince === null ? 0 : performance.now() - playingSince);
		const elapsedText = formatClock(elapsed / 1000);
		if (elapsedOut.textContent !== elapsedText) elapsedOut.textContent = elapsedText;
		const remainingText = formatClock(remainingSeconds(engine.remaining(), speedPx()));
		if (remainingOut.textContent !== remainingText) remainingOut.textContent = remainingText;
	}

	let lastAnnouncement = "";
	function announce(message: string) {
		// Re-announce an identical message by clearing first (e.g. "Paused" twice in a row).
		if (message === lastAnnouncement) status.textContent = "";
		lastAnnouncement = message;
		status.textContent = message;
	}

	// ---- Chrome auto-hide -------------------------------------------------------------------

	function showChrome() {
		root.dataset.chrome = "shown";
		scheduleHide();
	}

	function scheduleHide() {
		clearTimeout(hideTimer);
		if (!engine.playing || drawerOpen) return;
		hideTimer = setTimeout(() => {
			if (open && engine.playing && !drawerOpen) root.dataset.chrome = "hidden";
		}, HIDE_CHROME_MS);
	}

	// ---- Settings drawer -------------------------------------------------------------------

	/*
	 * Every setting, live. While it is open: playback carries on (so speed and size can be tuned while
	 * reading), the toolbar stays up, the prompt shortcuts are off so keys work on the form, Esc closes
	 * the drawer only, and the stage and toolbar are inert so focus stays in the drawer. A tap outside
	 * it closes it without toggling playback (the inert stage never sees the tap).
	 */
	function openDrawer() {
		if (drawerOpen) return;
		drawerOpen = true;
		root.dataset.drawer = "open";
		settingsButton.setAttribute("aria-expanded", "true");
		drawer.hidden = false;
		stage.root.inert = true;
		chrome.inert = true;
		showChrome();
		drawer.focus({ preventScroll: true });
	}

	/** `focusTo`: the Settings button after Esc or the close button; the view itself after a tap outside. */
	function closeDrawer(focusTo: HTMLElement | null = settingsButton) {
		if (!drawerOpen) return;
		drawerOpen = false;
		delete root.dataset.drawer;
		settingsButton.setAttribute("aria-expanded", "false");
		stage.root.inert = false;
		chrome.inert = false;
		drawer.hidden = true;
		focusTo?.focus({ preventScroll: true });
		showChrome();
	}

	function toggleDrawer() {
		if (drawerOpen) closeDrawer();
		else openDrawer();
	}

	// ---- Playback ------------------------------------------------------------------------

	/** Space, the Play button, a tap on the text and a clicker all come here. A toggle mid-countdown stops it. */
	function togglePlay() {
		if (countdownTimer) cancelCountdown();
		else if (engine.playing) pause();
		else requestPlay();
	}

	/**
	 * Undo a toggle: put playback back the way it was. A double tap uses this so it only moves the
	 * read line: a double tap while paused leaves no countdown running, and one while playing
	 * resumes at once, without a countdown (the reader was mid-sentence).
	 */
	function restorePlayState(wanted: PlayState) {
		const current = playState();
		if (current === wanted) return;
		if (current === "counting") clearCountdown();
		if (wanted === "playing") {
			startPlaying(false);
		} else if (wanted === "counting") {
			startCountdown();
		} else if (current === "playing") {
			pause();
		} else {
			renderPlayState();
			announce("Paused");
		}
	}

	function requestPlay() {
		dismissHint();
		if (engine.remaining() < 1) {
			announce("This is the end of the script. Press Home to go back to the top.");
			return;
		}
		// Every start from paused counts down, not just the first, so the reader can settle each time.
		if (settings().countdown) startCountdown();
		else startPlaying();
	}

	/** `asked`: false when a double tap restores playback, which analytics doesn't count as a play. */
	function startPlaying(asked = true) {
		playingSince = performance.now();
		engine.play();
		renderPlayState();
		announce("Playing");
		scheduleHide();
		clearInterval(refreshTimer);
		refreshTimer = setInterval(refreshTimers, TIMER_REFRESH_MS);
		if (asked) hooks.onPlay();
	}

	/** Stop the elapsed clock and its ticking, and show where it stopped. */
	function stopClock() {
		if (playingSince !== null) elapsedMs += performance.now() - playingSince;
		playingSince = null;
		clearInterval(refreshTimer);
		refreshTimer = undefined;
		refreshTimers();
	}

	function pause() {
		if (!engine.playing) return;
		engine.pause();
		stopClock();
		renderPlayState();
		showChrome();
		announce("Paused");
	}

	function handleEnd() {
		stopClock();
		renderPlayState();
		showChrome();
		announce("End of script");
		hooks.onReachedEnd();
	}

	function startCountdown() {
		countdownValue = COUNTDOWN_FROM;
		count.textContent = String(countdownValue);
		count.hidden = false;
		countdownTimer = setInterval(() => {
			countdownValue -= 1;
			if (countdownValue > 0) {
				count.textContent = String(countdownValue);
				return;
			}
			clearCountdown();
			startPlaying();
		}, 1000);
		renderPlayState();
	}

	function clearCountdown() {
		clearInterval(countdownTimer);
		countdownTimer = undefined;
		count.hidden = true;
		count.textContent = "";
	}

	function cancelCountdown() {
		clearCountdown();
		renderPlayState();
		announce("Countdown stopped");
	}

	function backToTop() {
		if (countdownTimer) clearCountdown();
		if (engine.playing) pause();
		engine.scrollTo(0, true);
		elapsedMs = 0;
		renderPlayState();
		refreshTimers();
		announce("Back at the top");
	}

	function changeSpeed(delta: number) {
		setSpeed(settings().speed + delta);
	}

	function setSpeed(value: number) {
		const next = clamp(Math.round(value), LIMITS.speed.min, LIMITS.speed.max);
		if (next !== settings().speed) store.set({ settings: { speed: next } });
	}

	function changeFontSize(delta: number) {
		const current = settings().fontSize;
		const next = clamp(current + delta, LIMITS.fontSize.min, LIMITS.fontSize.max);
		if (next !== current) store.set({ settings: { fontSize: next } });
	}

	function toggleMirror() {
		store.set({ settings: { mirror: !settings().mirror } });
	}

	function exit() {
		store.set({ view: "edit" });
	}

	function dismissHint() {
		if (hint.hidden) return;
		const hadFocus = hint.contains(document.activeElement);
		hint.hidden = true;
		write(KEYS.hintSeen, "1");
		if (hadFocus) root.focus({ preventScroll: true });
	}

	function run(action: PromptAction) {
		switch (action) {
			case "toggle":
				return togglePlay();
			case "speedUp":
				showChrome();
				return changeSpeed(1);
			case "speedDown":
				showChrome();
				return changeSpeed(-1);
			case "previousParagraph":
				return engine.jumpParagraph(-1, lineHeightPx());
			case "nextParagraph":
				return engine.jumpParagraph(1);
			case "top":
				showChrome();
				return backToTop();
			case "fullscreen":
				if (fullscreenSupported()) void toggleFullscreen(root);
				return;
			case "mirror":
				return toggleMirror();
			case "settings":
				return toggleDrawer();
			case "exit":
				return exit();
		}
	}

	// ---- Input -----------------------------------------------------------------------------

	/*
	 * Keys are handled on window in the capture phase while the view is open, before any focused
	 * control sees them. Every key we map is ours, whatever has focus: Space is always play/pause
	 * (never "press the focused button"), and arrows/Home/PageUp/PageDown on the focused speed slider
	 * do the prompter action instead of also nudging the slider, so nothing double-steps. Tab, Enter
	 * and End keep their native behaviour. In browser fullscreen the first Esc is consumed by the
	 * browser to leave fullscreen and never reaches the page; a second Esc exits Prompt view.
	 */
	function onKeyDown(event: KeyboardEvent) {
		if (!open || event.isComposing || modalDialogHasKeys(event)) return;
		if (drawerOpen) {
			// Shortcuts are off: arrows, Space and letters belong to the focused control. Esc closes the drawer.
			if (actionForKey(event, settings().arrowKeys) === "exit") {
				event.preventDefault();
				event.stopPropagation();
				closeDrawer();
			}
			return;
		}
		// Read the layout at keypress time, so a change in the drawer applies to the very next key.
		const action = actionForKey(event, settings().arrowKeys);
		if (!action) return;
		event.preventDefault();
		event.stopPropagation();
		if (event.repeat && !isRepeatable(action)) return;
		run(action);
	}

	function onKeyUp(event: KeyboardEvent) {
		if (!open || drawerOpen || modalDialogHasKeys(event)) return;
		// Firefox activates a focused button on Space keyup; Space already toggled playback on keydown.
		if (actionForKey(event, settings().arrowKeys) === "toggle") event.preventDefault();
	}

	/** A native modal (the Reset confirm, opened from the drawer) owns every key, so Esc closes it, not the drawer. */
	function modalDialogHasKeys(event: KeyboardEvent) {
		return (
			document.querySelector("dialog[open]") !== null ||
			(event.target instanceof Element && event.target.closest("dialog") !== null)
		);
	}

	let lastPointer = { x: 0, y: 0 };
	function onPointerMove(event: PointerEvent) {
		if (event.pointerType === "touch") return;
		if (Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y) < POINTER_WAKE_PX) return;
		lastPointer = { x: event.clientX, y: event.clientY };
		if (root.dataset.chrome === "hidden") showChrome();
		else scheduleHide();
	}

	root.addEventListener("pointermove", onPointerMove, { passive: true });
	root.addEventListener(
		"pointerdown",
		(event) => {
			if (drawerOpen) {
				if (!(event.target instanceof Node && drawer.contains(event.target))) closeDrawer(root);
				return;
			}
			showChrome();
		},
		{ passive: true },
	);
	chrome.addEventListener("focusin", () => showChrome());

	// While paused the remaining time follows hand scrolls and jumps; while playing the interval keeps it.
	scroller.addEventListener(
		"scroll",
		() => {
			if (open && !engine.playing) refreshTimers();
		},
		{ passive: true },
	);

	// Tap on the text = play/pause. A drag, a scroll or a tap that stops momentum doesn't count.
	let gesture: { id: number; x: number; y: number; t: number; paragraph: number; suppressed: boolean } | null = null;
	/** The last single tap, and the play state just before it toggled. */
	let lastTap: { t: number; x: number; y: number; before: PlayState } | null = null;

	scroller.addEventListener("pointerdown", (event) => {
		if (!event.isPrimary || event.button !== 0) return;
		gesture = {
			id: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			t: event.timeStamp,
			paragraph: stage.paragraphIndexOf(event.target),
			suppressed: engine.recentlyScrolledByUser(),
		};
	});
	scroller.addEventListener("pointercancel", () => {
		gesture = null;
	});
	scroller.addEventListener("pointerup", (event) => {
		const g = gesture;
		gesture = null;
		if (!g || g.id !== event.pointerId || g.suppressed) return;
		if (!isTap(event.clientX - g.x, event.clientY - g.y, event.timeStamp - g.t)) return;
		const tap = { t: event.timeStamp, x: event.clientX, y: event.clientY, before: playState() };
		// Every tap toggles at once (no waiting to see if a second tap follows). A double tap undoes
		// the first tap's toggle instead of toggling again, and moves the read line to the paragraph.
		if (lastTap && isDoubleTap(lastTap, tap)) {
			const before = lastTap.before;
			lastTap = null;
			if (g.paragraph >= 0) engine.jumpToParagraph(g.paragraph);
			restorePlayState(before);
		} else {
			togglePlay();
			lastTap = tap;
		}
	});

	playButton.addEventListener("click", togglePlay);
	slower.addEventListener("click", () => changeSpeed(-1));
	faster.addEventListener("click", () => changeSpeed(1));
	speedInput.addEventListener("input", () => setSpeed(Number(speedInput.value)));
	smaller.addEventListener("click", () => changeFontSize(-FONT_STEP));
	larger.addEventListener("click", () => changeFontSize(FONT_STEP));
	topButton.addEventListener("click", backToTop);
	mirrorButton.addEventListener("click", toggleMirror);
	settingsButton.addEventListener("click", toggleDrawer);
	el("drawer-close").addEventListener("click", () => closeDrawer());
	fsButton.addEventListener("click", () => void toggleFullscreen(root));
	exitButton.addEventListener("click", exit);
	el("hint-dismiss").addEventListener("click", dismissHint);

	function renderFullscreen() {
		fsButton.setAttribute("aria-pressed", String(fullscreenElement() === root));
	}

	// ---- Enter / leave -------------------------------------------------------------------

	/**
	 * Make everything outside the overlay inert, so focus and screen readers stay inside it. Native
	 * dialogs are left alone: the confirm opened from the drawer must stay usable, and a modal one
	 * makes the rest of the page inert by itself.
	 */
	function setBackgroundInert(on: boolean) {
		if (!on) {
			for (const node of inerted) node.inert = false;
			inerted = [];
			return;
		}
		const isDialogHost = (element: HTMLElement) =>
			element instanceof HTMLDialogElement || element.querySelector("dialog[open]") !== null;
		let node: HTMLElement = root;
		while (node !== document.body && node.parentElement) {
			for (const sibling of node.parentElement.children) {
				if (sibling !== node && sibling instanceof HTMLElement && !sibling.inert && !isDialogHost(sibling)) {
					sibling.inert = true;
					inerted.push(sibling);
				}
			}
			node = node.parentElement;
		}
	}

	function enter() {
		if (open) return;
		open = true;
		restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const { script, settings: s } = store.get();

		stage.render(script);
		root.hidden = false;
		renderSettings(s, null);
		elapsedMs = 0;
		playingSince = null;
		// Measure now, not next frame: the view was hidden, and the timers need the scroll range.
		relayoutNow();
		engine.scrollTo(0, true);
		refreshTimers();
		renderPlayState();
		showChrome();

		const canFullscreen = fullscreenSupported();
		fsButton.hidden = !canFullscreen;
		fsNote.hidden = canFullscreen;
		// Phones and tablets without a fine pointer get the short gesture hint, not the key list.
		const touchHint = isTouchOnly((query) => window.matchMedia(query).matches);
		hintKeys.hidden = touchHint;
		hintTouch.hidden = !touchHint;
		const fsRow = hint.querySelector<HTMLElement>('[data-shortcut="fullscreen"]');
		if (fsRow) fsRow.hidden = !canFullscreen;
		hint.hidden = read(KEYS.hintSeen) !== null;
		stopFullscreenWatch = onFullscreenChange(renderFullscreen);
		renderFullscreen();

		setBackgroundInert(true);
		wakeLock.acquire();
		resizeObserver.observe(scroller);
		resizeObserver.observe(text);
		window.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("keyup", onKeyUp, true);
		root.focus({ preventScroll: true });
	}

	function leave() {
		if (!open) return;
		closeDrawer(null);
		clearCountdown();
		engine.pause();
		stopClock();
		open = false;

		cancelAnimationFrame(relayoutFrame);
		relayoutFrame = 0;
		clearTimeout(hideTimer);
		resizeObserver.disconnect();
		window.removeEventListener("keydown", onKeyDown, true);
		window.removeEventListener("keyup", onKeyUp, true);
		stopFullscreenWatch?.();
		stopFullscreenWatch = null;
		if (fullscreenElement() === root) void exitFullscreen();
		wakeLock.release();

		root.hidden = true;
		root.dataset.chrome = "shown";
		setBackgroundInert(false);
		if (restoreFocus?.isConnected) restoreFocus.focus({ preventScroll: true });
		restoreFocus = null;
	}

	function onStateChange(state: Readonly<State>, previous: Readonly<State>) {
		if (state.view === "prompt" && !open) return enter();
		if (state.view !== "prompt") return leave();
		if (state.script !== previous.script) {
			stage.render(state.script);
			requestRelayout();
		}
		if (state.settings !== previous.settings) {
			const s = state.settings;
			const p = previous.settings;
			renderSettings(s, p);
			refreshTimers();
			if (s.speed !== p.speed) announce(`Speed ${s.speed}`);
			if (s.mirror !== p.mirror) announce(s.mirror ? "Mirror on" : "Mirror off");
			if (s.flip !== p.flip) announce(s.flip ? "Flip on" : "Flip off");
			if (s.fontSize !== p.fontSize) announce(`Text size ${s.fontSize}`);
		}
	}

	store.subscribe(onStateChange);
	if (store.get().view === "prompt") enter();
}
