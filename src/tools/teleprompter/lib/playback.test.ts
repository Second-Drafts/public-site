import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayback } from "./playback";
import type { PlaybackOptions } from "./playback";

function setup({ countdown = false, remaining = 1000 } = {}) {
	const engine = {
		playing: false,
		play: vi.fn(() => {
			engine.playing = true;
		}),
		pause: vi.fn(() => {
			engine.playing = false;
		}),
		remaining: () => remaining,
		scrollTo: vi.fn(),
	};
	const options = {
		engine,
		countdownEnabled: () => countdown,
		announce: vi.fn(),
		onStateChange: vi.fn(),
		onCountdown: vi.fn(),
		onClockTick: vi.fn(),
		onPlay: vi.fn(),
		onReachedEnd: vi.fn(),
	} satisfies PlaybackOptions;
	return { engine, options, playback: createPlayback(options) };
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("createPlayback", () => {
	it("toggles between playing and paused, counting each play", () => {
		const { playback, options } = setup();
		playback.toggle();
		expect(playback.state()).toBe("playing");
		expect(options.onPlay).toHaveBeenCalledOnce();
		playback.toggle();
		expect(playback.state()).toBe("paused");
		expect(options.onStateChange.mock.calls).toEqual([["playing"], ["paused"]]);
	});

	it("counts down from 3 before playing", () => {
		const { playback, options } = setup({ countdown: true });
		playback.toggle();
		expect(playback.state()).toBe("counting");
		vi.advanceTimersByTime(2000);
		expect(options.onCountdown.mock.calls).toEqual([[3], [2], [1]]);
		expect(options.onPlay).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1000);
		expect(playback.state()).toBe("playing");
		expect(options.onCountdown).toHaveBeenLastCalledWith(null);
		expect(options.onPlay).toHaveBeenCalledOnce();
	});

	it("stops a countdown on toggle", () => {
		const { playback, options } = setup({ countdown: true });
		playback.toggle();
		playback.toggle();
		expect(playback.state()).toBe("paused");
		expect(options.announce).toHaveBeenLastCalledWith("Countdown stopped");
		vi.advanceTimersByTime(5000);
		expect(playback.state()).toBe("paused");
	});

	it("won't play at the end of the script", () => {
		const { playback, options } = setup({ remaining: 0 });
		playback.toggle();
		expect(playback.state()).toBe("paused");
		expect(options.announce).toHaveBeenCalledWith(expect.stringContaining("end of the script"));
	});

	it("restores playing at once, without a countdown, and doesn't count it as a play", () => {
		const { playback, options } = setup({ countdown: true });
		playback.restore("playing");
		expect(playback.state()).toBe("playing");
		expect(options.onPlay).not.toHaveBeenCalled();
	});

	it("restores paused from a countdown, leaving no countdown running", () => {
		const { playback } = setup({ countdown: true });
		playback.toggle();
		playback.restore("paused");
		vi.advanceTimersByTime(5000);
		expect(playback.state()).toBe("paused");
	});

	it("restores a countdown that a tap stopped", () => {
		const { playback } = setup({ countdown: true });
		playback.toggle();
		playback.toggle();
		playback.restore("counting");
		expect(playback.state()).toBe("counting");
	});

	it("keeps elapsed time across pauses and zeroes it at the top", () => {
		const { playback, engine } = setup();
		playback.toggle();
		vi.advanceTimersByTime(1000);
		playback.toggle();
		vi.advanceTimersByTime(5000);
		playback.toggle();
		vi.advanceTimersByTime(500);
		expect(playback.elapsedMs()).toBeCloseTo(1500);
		playback.backToTop();
		expect(playback.state()).toBe("paused");
		expect(engine.scrollTo).toHaveBeenCalledWith(0, true);
		expect(playback.elapsedMs()).toBe(0);
	});

	it("ticks the clock while playing", () => {
		const { playback, options } = setup();
		playback.toggle();
		vi.advanceTimersByTime(1000);
		expect(options.onClockTick).toHaveBeenCalledTimes(4);
	});

	it("stops the clock when the engine reaches the end", () => {
		const { playback, engine, options } = setup();
		playback.toggle();
		vi.advanceTimersByTime(1000);
		engine.playing = false;
		playback.reachedEnd();
		vi.advanceTimersByTime(1000);
		expect(playback.elapsedMs()).toBeCloseTo(1000);
		expect(options.onReachedEnd).toHaveBeenCalledOnce();
		expect(options.onStateChange).toHaveBeenLastCalledWith("paused");
	});

	it("stops silently and zeroes the clock", () => {
		const { playback, options } = setup();
		playback.toggle();
		vi.advanceTimersByTime(1000);
		options.announce.mockClear();
		playback.stop();
		expect(playback.state()).toBe("paused");
		expect(playback.elapsedMs()).toBe(0);
		expect(options.announce).not.toHaveBeenCalled();
	});
});
