import type { ScrollEngine } from "./engine";

export type PlayState = "paused" | "counting" | "playing";

const COUNTDOWN_FROM = 3;
const CLOCK_TICK_MS = 250;

export interface PlaybackOptions {
	engine: Pick<ScrollEngine, "playing" | "play" | "pause" | "remaining" | "scrollTo">;
	countdownEnabled(): boolean;
	announce(message: string): void;
	onStateChange(state: PlayState): void;
	/** Seconds left to count down, or null once the countdown is over or stopped. */
	onCountdown(secondsLeft: number | null): void;
	/** Every 250 ms while playing, and whenever the elapsed time stops or goes back to zero. */
	onClockTick(): void;
	/** The reader started scrolling from paused (after any countdown). Not called by `restore`. */
	onPlay(): void;
	onReachedEnd(): void;
}

export interface Playback {
	state(): PlayState;
	elapsedMs(): number;
	/** Play (counting down first, if that's on), pause, or stop a running countdown. */
	toggle(): void;
	/**
	 * Undo a toggle. A double tap uses this so it only moves the read line: restoring "paused" leaves
	 * no countdown running, and restoring "playing" resumes at once, without a countdown (the reader
	 * was mid-sentence). It is not a play.
	 */
	restore(state: PlayState): void;
	backToTop(): void;
	/** The engine scrolled to the end and stopped itself. */
	reachedEnd(): void;
	/** Stop everything without announcing it, and zero the clock. */
	stop(): void;
}

export function createPlayback(options: PlaybackOptions): Playback {
	const { engine, announce } = options;
	let countdownTimer: ReturnType<typeof setInterval> | undefined;
	let countdownSecondsLeft = 0;
	let clockTimer: ReturnType<typeof setInterval> | undefined;
	let elapsedBeforeThisRunMs = 0;
	let playingSince: number | null = null;
	let reportedState: PlayState = "paused";

	const state = (): PlayState => (countdownTimer ? "counting" : engine.playing ? "playing" : "paused");
	const elapsedMs = () => elapsedBeforeThisRunMs + (playingSince === null ? 0 : performance.now() - playingSince);

	function reportState() {
		const current = state();
		if (current === reportedState) return;
		reportedState = current;
		options.onStateChange(current);
	}

	function toggle() {
		if (countdownTimer) cancelCountdown();
		else if (engine.playing) pause();
		else requestPlay();
	}

	function restore(wanted: PlayState) {
		const current = state();
		if (current === wanted) return;
		if (current === "counting") clearCountdown();
		if (wanted === "playing") {
			startPlaying({ countsAsPlay: false });
		} else if (wanted === "counting") {
			startCountdown();
		} else if (current === "playing") {
			pause();
		} else {
			reportState();
			announce("Paused");
		}
	}

	function requestPlay() {
		if (engine.remaining() < 1) {
			announce("This is the end of the script. Press Home to go back to the top.");
			return;
		}
		// Every start from paused counts down, not just the first, so the reader can settle each time.
		if (options.countdownEnabled()) startCountdown();
		else startPlaying({ countsAsPlay: true });
	}

	function startPlaying({ countsAsPlay }: { countsAsPlay: boolean }) {
		playingSince = performance.now();
		engine.play();
		reportState();
		announce("Playing");
		clearInterval(clockTimer);
		clockTimer = setInterval(options.onClockTick, CLOCK_TICK_MS);
		if (countsAsPlay) options.onPlay();
	}

	function pause() {
		if (!engine.playing) return;
		engine.pause();
		stopClock();
		reportState();
		announce("Paused");
	}

	function reachedEnd() {
		stopClock();
		reportState();
		announce("End of script");
		options.onReachedEnd();
	}

	function stopClock() {
		if (playingSince !== null) elapsedBeforeThisRunMs += performance.now() - playingSince;
		playingSince = null;
		clearInterval(clockTimer);
		clockTimer = undefined;
		options.onClockTick();
	}

	function startCountdown() {
		countdownSecondsLeft = COUNTDOWN_FROM;
		options.onCountdown(countdownSecondsLeft);
		countdownTimer = setInterval(() => {
			countdownSecondsLeft -= 1;
			if (countdownSecondsLeft > 0) {
				options.onCountdown(countdownSecondsLeft);
				return;
			}
			clearCountdown();
			startPlaying({ countsAsPlay: true });
		}, 1000);
		reportState();
	}

	function clearCountdown() {
		clearInterval(countdownTimer);
		countdownTimer = undefined;
		options.onCountdown(null);
	}

	function cancelCountdown() {
		clearCountdown();
		reportState();
		announce("Countdown stopped");
	}

	function backToTop() {
		if (countdownTimer) clearCountdown();
		pause();
		engine.scrollTo(0, true);
		elapsedBeforeThisRunMs = 0;
		reportState();
		options.onClockTick();
		announce("Back at the top");
	}

	function stop() {
		clearCountdown();
		engine.pause();
		stopClock();
		elapsedBeforeThisRunMs = 0;
		reportState();
	}

	return { state, elapsedMs, toggle, restore, backToTop, reachedEnd, stop };
}
