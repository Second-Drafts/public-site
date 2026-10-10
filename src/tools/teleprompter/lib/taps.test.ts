import { describe, expect, it, vi } from "vitest";
import { createTapRecognizer } from "./taps";

function setup() {
	const onTap = vi.fn();
	const onDoubleTap = vi.fn();
	const recognizer = createTapRecognizer({ onTap, onDoubleTap });
	const tap = (t: number, { x = 0, ignored = false, target = null as EventTarget | null } = {}) => {
		recognizer.press({ id: 1, x, y: 0, t, target, ignored });
		recognizer.release({ id: 1, x, y: 0, t: t + 50 });
	};
	return { recognizer, onTap, onDoubleTap, tap };
}

describe("createTapRecognizer", () => {
	it("reports a short, still press as a tap", () => {
		const { onTap, onDoubleTap, tap } = setup();
		tap(0);
		expect(onTap).toHaveBeenCalledOnce();
		expect(onDoubleTap).not.toHaveBeenCalled();
	});

	it("ignores a drag", () => {
		const { recognizer, onTap } = setup();
		recognizer.press({ id: 1, x: 0, y: 0, t: 0, target: null, ignored: false });
		recognizer.release({ id: 1, x: 0, y: 40, t: 50 });
		expect(onTap).not.toHaveBeenCalled();
	});

	it("ignores an ignored press, a cancelled press and a release from another pointer", () => {
		const { recognizer, onTap, tap } = setup();
		tap(0, { ignored: true });
		recognizer.press({ id: 1, x: 0, y: 0, t: 1000, target: null, ignored: false });
		recognizer.cancel();
		recognizer.release({ id: 1, x: 0, y: 0, t: 1050 });
		recognizer.press({ id: 1, x: 0, y: 0, t: 2000, target: null, ignored: false });
		recognizer.release({ id: 2, x: 0, y: 0, t: 2050 });
		expect(onTap).not.toHaveBeenCalled();
	});

	it("reports a quick second tap as a double tap, with the second press's target", () => {
		const { onTap, onDoubleTap, tap } = setup();
		const target = {} as EventTarget;
		tap(0);
		tap(200, { target });
		expect(onTap).toHaveBeenCalledOnce();
		expect(onDoubleTap).toHaveBeenCalledExactlyOnceWith(target);
	});

	it("starts over after a double tap, so a third tap is a single tap", () => {
		const { onTap, onDoubleTap, tap } = setup();
		tap(0);
		tap(200);
		tap(400);
		expect(onTap).toHaveBeenCalledTimes(2);
		expect(onDoubleTap).toHaveBeenCalledOnce();
	});

	it("treats a slow or distant second tap as a new single tap", () => {
		const { onTap, onDoubleTap, tap } = setup();
		tap(0);
		tap(1000);
		tap(1200, { x: 100 });
		expect(onTap).toHaveBeenCalledTimes(3);
		expect(onDoubleTap).not.toHaveBeenCalled();
	});
});
