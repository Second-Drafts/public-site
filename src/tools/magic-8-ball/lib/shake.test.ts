import { describe, expect, it } from "vitest";
import {
	createDragShakeDetector,
	createMotionShakeDetector,
	type MotionSample,
	type PointerSample,
	type ShakeDetector,
} from "./shake";

const STEP_MS = 16;

function horizontalZigzag(options: {
	startTime: number;
	swings: number;
	swingPx: number;
	swingMs: number;
}): PointerSample[] {
	const samples: PointerSample[] = [];
	const stepsPerSwing = Math.round(options.swingMs / STEP_MS);
	let x = 200;
	let time = options.startTime;
	for (let swing = 0; swing < options.swings; swing++) {
		const sign = swing % 2 === 0 ? 1 : -1;
		for (let step = 0; step < stepsPerSwing; step++) {
			x += (sign * options.swingPx) / stepsPerSwing;
			time += STEP_MS;
			samples.push({ x, y: 300, time });
		}
	}
	return samples;
}

function countFirings<Sample>(detector: ShakeDetector<Sample>, samples: Sample[]): number {
	return samples.filter((sample) => detector.push(sample)).length;
}

describe("drag shake detector", () => {
	const shake = { startTime: 0, swings: 6, swingPx: 80, swingMs: 80 };

	it("fires once for a vigorous back-and-forth", () => {
		const detector = createDragShakeDetector();
		expect(countFirings(detector, horizontalZigzag(shake))).toBe(1);
	});

	it("fires on a vertical shake too", () => {
		const detector = createDragShakeDetector();
		const vertical = horizontalZigzag(shake).map(({ x, y, time }) => ({ x: y, y: x, time }));
		expect(countFirings(detector, vertical)).toBe(1);
	});

	it("does not fire on a slow back-and-forth drag", () => {
		const detector = createDragShakeDetector();
		const slow = horizontalZigzag({ ...shake, swingMs: 800, swings: 6 });
		expect(countFirings(detector, slow)).toBe(0);
	});

	it("does not fire on a single fling", () => {
		const detector = createDragShakeDetector();
		const fling = horizontalZigzag({ ...shake, swings: 1, swingPx: 400, swingMs: 160 });
		expect(countFirings(detector, fling)).toBe(0);
	});

	it("does not fire on a fling and a return", () => {
		const detector = createDragShakeDetector();
		const flingAndReturn = horizontalZigzag({ ...shake, swings: 2 });
		expect(countFirings(detector, flingAndReturn)).toBe(0);
	});

	it("does not fire on tiny jitter", () => {
		const detector = createDragShakeDetector();
		const jitter = Array.from({ length: 80 }, (_, index) => ({
			x: 200 + (index % 2 === 0 ? 3 : -3),
			y: 300 + (index % 3 === 0 ? 2 : -2),
			time: index * STEP_MS,
		}));
		expect(countFirings(detector, jitter)).toBe(0);
	});

	it("does not fire when the reversals are spread beyond the window", () => {
		const detector = createDragShakeDetector();
		const spreadOut = horizontalZigzag({ ...shake, swings: 6, swingMs: 400 });
		expect(countFirings(detector, spreadOut)).toBe(0);
	});

	it("holds fire during the cooldown, then fires again for a new shake", () => {
		const detector = createDragShakeDetector();
		const first = horizontalZigzag(shake);
		const firstEnd = first[first.length - 1].time;
		const during = horizontalZigzag({ ...shake, startTime: firstEnd + 100 });
		const after = horizontalZigzag({ ...shake, startTime: firstEnd + 5_000 });
		expect(countFirings(detector, first)).toBe(1);
		expect(countFirings(detector, during)).toBe(0);
		expect(countFirings(detector, after)).toBe(1);
	});

	it("keeps going into one more shake only after a reset clears the cooldown", () => {
		const detector = createDragShakeDetector({ cooldownMs: 100_000 });
		const first = horizontalZigzag(shake);
		expect(countFirings(detector, first)).toBe(1);
		detector.reset();
		expect(countFirings(detector, horizontalZigzag({ ...shake, startTime: 1_000 }))).toBe(1);
	});

	it("forgets a half-finished shake after a reset", () => {
		const detector = createDragShakeDetector();
		const partial = horizontalZigzag({ ...shake, swings: 3 });
		countFirings(detector, partial);
		detector.reset();
		const rest = horizontalZigzag({ ...shake, swings: 2, startTime: partial[partial.length - 1].time });
		expect(countFirings(detector, rest)).toBe(0);
	});

	it("respects overridden options", () => {
		const detector = createDragShakeDetector({ reversalsToFire: 2 });
		expect(countFirings(detector, horizontalZigzag({ ...shake, swings: 4 }))).toBe(1);
	});
});

function jolts(options: { startTime: number; count: number; gapMs: number; size: number }): MotionSample[] {
	const samples: MotionSample[] = [{ x: 0, y: 0, z: 9.8, time: options.startTime }];
	for (let index = 1; index <= options.count; index++) {
		const sign = index % 2 === 0 ? 1 : -1;
		samples.push({
			x: sign * options.size,
			y: 0,
			z: 9.8,
			time: options.startTime + index * options.gapMs,
		});
	}
	return samples;
}

describe("motion shake detector", () => {
	it("fires once for a real shake", () => {
		const detector = createMotionShakeDetector();
		const shake = jolts({ startTime: 0, count: 6, gapMs: 100, size: 15 });
		expect(countFirings(detector, shake)).toBe(1);
	});

	it("does not fire for a phone at rest", () => {
		const detector = createMotionShakeDetector();
		const resting = Array.from({ length: 100 }, (_, index) => ({
			x: 0.1 * Math.sin(index),
			y: 0.1 * Math.cos(index),
			z: 9.8,
			time: index * STEP_MS,
		}));
		expect(countFirings(detector, resting)).toBe(0);
	});

	it("does not fire for a gentle tilt", () => {
		const detector = createMotionShakeDetector();
		const tilt = Array.from({ length: 100 }, (_, index) => {
			const angle = (index / 100) * (Math.PI / 2);
			return { x: 9.8 * Math.sin(angle), y: 0, z: 9.8 * Math.cos(angle), time: index * STEP_MS };
		});
		expect(countFirings(detector, tilt)).toBe(0);
	});

	it("does not fire for one bump", () => {
		const detector = createMotionShakeDetector();
		const bump: MotionSample[] = [
			{ x: 0, y: 0, z: 9.8, time: 0 },
			{ x: 20, y: 0, z: 9.8, time: 16 },
			{ x: 0, y: 0, z: 9.8, time: 32 },
			{ x: 0, y: 0, z: 9.8, time: 48 },
		];
		expect(countFirings(detector, bump)).toBe(0);
	});

	it("does not fire when jolts are further apart than the window", () => {
		const detector = createMotionShakeDetector();
		const sparse = jolts({ startTime: 0, count: 4, gapMs: 1_500, size: 15 });
		expect(countFirings(detector, sparse)).toBe(0);
	});

	it("holds fire during the cooldown, then fires again", () => {
		const detector = createMotionShakeDetector();
		const first = jolts({ startTime: 0, count: 4, gapMs: 100, size: 15 });
		const during = jolts({ startTime: 500, count: 4, gapMs: 100, size: 15 });
		const after = jolts({ startTime: 5_000, count: 4, gapMs: 100, size: 15 });
		expect(countFirings(detector, first)).toBe(1);
		expect(countFirings(detector, during)).toBe(0);
		expect(countFirings(detector, after)).toBe(1);
	});

	it("forgets earlier jolts after a reset", () => {
		const detector = createMotionShakeDetector();
		const [rest, firstJolt] = jolts({ startTime: 0, count: 1, gapMs: 100, size: 15 });
		detector.push(rest);
		detector.push(firstJolt);
		detector.reset();
		const [, , secondJolt] = jolts({ startTime: 0, count: 2, gapMs: 100, size: 15 });
		expect(detector.push({ ...secondJolt, time: 300 })).toBe(false);
	});
});
