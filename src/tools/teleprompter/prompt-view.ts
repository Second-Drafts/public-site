import { inertOutside, required } from "./lib/dom";
import { createScrollEngine } from "./lib/engine";
import type { ScrollEngine } from "./lib/engine";
import type { PromptAction } from "./lib/keyboard";
import { clamp } from "./lib/math";
import { createPlayback } from "./lib/playback";
import type { PlayState } from "./lib/playback";
import {
	createWakeLock,
	exitFullscreen,
	fullscreenElement,
	fullscreenSupported,
	onFullscreenChange,
	toggleFullscreen,
} from "./lib/platform";
import { LIMITS } from "./lib/settings";
import type { Settings } from "./lib/settings";
import { pixelsPerSecond } from "./lib/speed";
import type { State, Store } from "./lib/store";
import { listenForTaps } from "./lib/taps";
import { resolveTheme, siteThemeFor } from "./lib/themes";
import { formatClock, remainingSeconds } from "./lib/timing";
import { createChromeAutoHide } from "./prompt-chrome";
import { createSettingsDrawer } from "./prompt-drawer";
import { createShortcutHint } from "./prompt-hint";
import { listenForPromptKeys } from "./prompt-keys";
import { createRelayout } from "./prompt-relayout";
import { createStage } from "./stage";

export interface PromptHooks {
	onPlay(): void;
	onReachedEnd(): void;
}

declare global {
	interface Window {
		__tpPrompt?: { engine: ScrollEngine; root: HTMLElement };
	}
}

const FONT_STEP = LIMITS.fontSize.step * 2;

const LAYOUT_KEYS = ["font", "bold", "theme", "fontSize", "lineHeight", "columnWidth", "align", "guidePosition"] as const;

export function mountPromptView(store: Store, hooks: PromptHooks): void {
	const root = required(document, "[data-tp-prompt]");
	const part = <T extends HTMLElement = HTMLElement>(name: string) => required<T>(root, `[data-tpp="${name}"]`);

	const stage = createStage(required(root, "[data-tp-stage]"), {
		emptyMessage: "There's no script yet. Press Escape and paste one in.",
		themeTarget: root,
	});
	const { scroller, text } = stage;
	const countdown = part("count");
	const status = part("status");
	const chrome = part("chrome");
	const playLabel = part("play-label");
	const slower = part<HTMLButtonElement>("slower");
	const faster = part<HTMLButtonElement>("faster");
	const speedInput = part<HTMLInputElement>("speed");
	const speedValue = part("speed-value");
	const smaller = part<HTMLButtonElement>("smaller");
	const larger = part<HTMLButtonElement>("larger");
	const elapsedOut = part("elapsed");
	const remainingOut = part("remaining");
	const mirrorButton = part<HTMLButtonElement>("mirror");
	const fullscreenButton = part<HTMLButtonElement>("fullscreen");
	const drawerPanel = part("drawer");

	const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
	const wakeLock = createWakeLock();

	let open = false;
	let focusBeforeEnter: HTMLElement | null = null;
	let sessionCleanups: Array<() => void> = [];

	const settings = () => store.get().settings;
	const lineHeightPx = () => settings().fontSize * settings().lineHeight;
	const speedPx = (current: Settings = settings()) =>
		pixelsPerSecond(current.speed, current.fontSize, current.lineHeight);

	const engine = createScrollEngine({
		scroller,
		text,
		onEnd: () => playback.reachedEnd(),
		reducedMotion: () => reduceMotion.matches,
	});
	if (import.meta.env.DEV) window.__tpPrompt = { engine, root };

	const playback = createPlayback({
		engine,
		countdownEnabled: () => settings().countdown,
		announce,
		onStateChange(state) {
			renderPlayState(state);
			chromeAutoHide.show();
		},
		onCountdown(secondsLeft) {
			countdown.hidden = secondsLeft === null;
			countdown.textContent = secondsLeft === null ? "" : String(secondsLeft);
		},
		onClockTick: renderTimes,
		onPlay: hooks.onPlay,
		onReachedEnd: hooks.onReachedEnd,
	});

	const relayout = createRelayout(engine, scroller, text, renderTimes);
	const hint = createShortcutHint(part("hint"), root);
	const chromeAutoHide = createChromeAutoHide(root, chrome, () => open && engine.playing && !drawer.isOpen());
	const drawer = createSettingsDrawer({
		host: root,
		drawer: drawerPanel,
		toggleButton: part<HTMLButtonElement>("settings"),
		closeButton: part<HTMLButtonElement>("drawer-close"),
		background: [stage.root, chrome],
		onOpenChange: chromeAutoHide.show,
	});

	function renderSettings(current: Settings, previous: Settings | null) {
		relayout.afterFontLoads(stage.apply(current));
		const siteTheme = siteThemeFor(resolveTheme(current).background);
		root.style.colorScheme = siteTheme;
		if (drawerPanel.dataset.theme !== siteTheme) drawerPanel.dataset.theme = siteTheme;
		root.style.setProperty("--tpp-guide-pos", String(current.guidePosition));
		root.style.setProperty("--tpp-line", `${current.fontSize * current.lineHeight}px`);

		speedInput.value = String(current.speed);
		speedInput.setAttribute("aria-valuetext", `Speed ${current.speed} of ${LIMITS.speed.max}`);
		speedValue.textContent = String(current.speed);
		setAriaDisabled(slower, current.speed <= LIMITS.speed.min);
		setAriaDisabled(faster, current.speed >= LIMITS.speed.max);
		setAriaDisabled(smaller, current.fontSize <= LIMITS.fontSize.min);
		setAriaDisabled(larger, current.fontSize >= LIMITS.fontSize.max);
		mirrorButton.setAttribute("aria-pressed", String(current.mirror));
		if (!previous || current.arrowKeys !== previous.arrowKeys) hint.relabel(current.arrowKeys);
		engine.setSpeed(speedPx(current));

		if (!previous || LAYOUT_KEYS.some((key) => current[key] !== previous[key])) relayout.request();
	}

	/** aria-disabled, not disabled, so a focused button keeps focus when it reaches its limit. */
	function setAriaDisabled(button: HTMLButtonElement, disabled: boolean) {
		button.setAttribute("aria-disabled", String(disabled));
	}

	function renderPlayState(state: PlayState) {
		root.dataset.state = state;
		playLabel.textContent = state === "paused" ? "Play" : "Pause";
	}

	function renderTimes() {
		const elapsedText = formatClock(playback.elapsedMs() / 1000);
		if (elapsedOut.textContent !== elapsedText) elapsedOut.textContent = elapsedText;
		const remainingText = formatClock(remainingSeconds(engine.remaining(), speedPx()));
		if (remainingOut.textContent !== remainingText) remainingOut.textContent = remainingText;
	}

	function renderFullscreen() {
		fullscreenButton.setAttribute("aria-pressed", String(fullscreenElement() === root));
	}

	let lastAnnouncement = "";
	function announce(message: string) {
		// Clearing first makes screen readers repeat an identical message (e.g. "Paused" twice in a row).
		if (message === lastAnnouncement) status.textContent = "";
		lastAnnouncement = message;
		status.textContent = message;
	}

	function togglePlay() {
		if (playback.state() === "paused") hint.dismiss();
		playback.toggle();
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

	function run(action: PromptAction) {
		switch (action) {
			case "toggle":
				return togglePlay();
			case "speedUp":
				chromeAutoHide.show();
				return changeSpeed(1);
			case "speedDown":
				chromeAutoHide.show();
				return changeSpeed(-1);
			case "previousParagraph":
				return engine.jumpParagraph(-1, lineHeightPx());
			case "nextParagraph":
				return engine.jumpParagraph(1);
			case "top":
				chromeAutoHide.show();
				return playback.backToTop();
			case "fullscreen":
				if (fullscreenSupported()) void toggleFullscreen(root);
				return;
			case "mirror":
				return toggleMirror();
			case "settings":
				return drawer.toggle();
			case "exit":
				return exit();
		}
	}

	let stateBeforeTap: PlayState = "paused";
	listenForTaps(scroller, {
		ignorePress: () => engine.recentlyScrolledByUser(),
		onTap() {
			stateBeforeTap = playback.state();
			togglePlay();
		},
		onDoubleTap(target) {
			const paragraph = stage.paragraphIndexOf(target);
			if (paragraph >= 0) engine.jumpToParagraph(paragraph);
			playback.restore(stateBeforeTap);
		},
	});

	scroller.addEventListener(
		"scroll",
		() => {
			if (open && !engine.playing) renderTimes();
		},
		{ passive: true },
	);

	part("play").addEventListener("click", togglePlay);
	slower.addEventListener("click", () => changeSpeed(-1));
	faster.addEventListener("click", () => changeSpeed(1));
	speedInput.addEventListener("input", () => setSpeed(Number(speedInput.value)));
	smaller.addEventListener("click", () => changeFontSize(-FONT_STEP));
	larger.addEventListener("click", () => changeFontSize(FONT_STEP));
	part("top").addEventListener("click", playback.backToTop);
	mirrorButton.addEventListener("click", toggleMirror);
	fullscreenButton.addEventListener("click", () => void toggleFullscreen(root));
	part("exit").addEventListener("click", exit);

	function enter() {
		if (open) return;
		open = true;
		focusBeforeEnter = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const { script, settings: current } = store.get();

		stage.render(script);
		root.hidden = false;
		renderSettings(current, null);
		relayout.now();
		engine.scrollTo(0, true);
		renderTimes();
		renderPlayState(playback.state());
		chromeAutoHide.show();

		const canFullscreen = fullscreenSupported();
		fullscreenButton.hidden = !canFullscreen;
		hint.show({ canFullscreen });
		renderFullscreen();

		sessionCleanups = [
			onFullscreenChange(renderFullscreen),
			inertOutside(root),
			listenForPromptKeys({
				arrowKeys: () => settings().arrowKeys,
				drawerIsOpen: drawer.isOpen,
				closeDrawer: () => drawer.close(),
				run,
			}),
		];
		wakeLock.acquire();
		relayout.follow();
		root.focus({ preventScroll: true });
	}

	function leave() {
		if (!open) return;
		drawer.close(null);
		playback.stop();
		open = false;

		relayout.stop();
		chromeAutoHide.reset();
		for (const cleanUp of sessionCleanups) cleanUp();
		sessionCleanups = [];
		if (fullscreenElement() === root) void exitFullscreen();
		wakeLock.release();

		root.hidden = true;
		if (focusBeforeEnter?.isConnected) focusBeforeEnter.focus({ preventScroll: true });
		focusBeforeEnter = null;
	}

	function onStateChange(state: Readonly<State>, previous: Readonly<State>) {
		if (state.view === "prompt" && !open) return enter();
		if (state.view !== "prompt") return leave();
		if (state.script !== previous.script) {
			stage.render(state.script);
			relayout.request();
		}
		if (state.settings !== previous.settings) {
			renderSettings(state.settings, previous.settings);
			renderTimes();
			announceSettingChanges(state.settings, previous.settings);
		}
	}

	function announceSettingChanges(current: Settings, previous: Settings) {
		if (current.speed !== previous.speed) announce(`Speed ${current.speed}`);
		if (current.mirror !== previous.mirror) announce(current.mirror ? "Mirror on" : "Mirror off");
		if (current.flip !== previous.flip) announce(current.flip ? "Flip on" : "Flip off");
		if (current.fontSize !== previous.fontSize) announce(`Text size ${current.fontSize}`);
	}

	store.subscribe(onStateChange);
	if (store.get().view === "prompt") enter();
}
