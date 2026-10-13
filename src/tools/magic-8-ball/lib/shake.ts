export interface PointerSample {
	x: number;
	y: number;
	time: number;
}

export interface MotionSample {
	x: number;
	y: number;
	z: number;
	time: number;
}

export interface ShakeDetector<Sample> {
	push(sample: Sample): boolean;
	reset(): void;
}

export interface DragShakeOptions {
	windowMs: number;
	reversalsToFire: number;
	minSwingPx: number;
	minSpeedPxPerMs: number;
	cooldownMs: number;
}

export interface MotionShakeOptions {
	windowMs: number;
	joltsToFire: number;
	joltThreshold: number;
	minJoltGapMs: number;
	cooldownMs: number;
}

export const DEFAULT_DRAG_SHAKE_OPTIONS: DragShakeOptions = {
	windowMs: 600,
	reversalsToFire: 3,
	minSwingPx: 12,
	minSpeedPxPerMs: 0.6,
	cooldownMs: 700,
};

export const DEFAULT_MOTION_SHAKE_OPTIONS: MotionShakeOptions = {
	windowMs: 800,
	joltsToFire: 2,
	joltThreshold: 12,
	minJoltGapMs: 60,
	cooldownMs: 1000,
};

interface Point {
	value: number;
	time: number;
}

interface AxisTracker {
	push(value: number, time: number): number | null;
	reset(): void;
}

function createAxisTracker(options: DragShakeOptions): AxisTracker {
	const turnConfirmationPx = options.minSwingPx / 2;
	let pivot: Point | null = null;
	let extreme: Point | null = null;
	let direction = 0;

	function isQualifyingSwing(from: Point, to: Point): boolean {
		const distance = Math.abs(to.value - from.value);
		const duration = Math.max(to.time - from.time, 1);
		return distance >= options.minSwingPx && distance / duration >= options.minSpeedPxPerMs;
	}

	function confirmTurn(point: Point): number | null {
		const previousPivot = pivot;
		pivot = extreme;
		extreme = point;
		direction = -direction;
		const turn = pivot as Point;
		return previousPivot && isQualifyingSwing(previousPivot, turn) ? turn.time : null;
	}

	return {
		push(value, time) {
			const point = { value, time };
			if (pivot === null || extreme === null) {
				pivot = point;
				extreme = point;
				return null;
			}
			if (direction === 0) {
				if (value !== extreme.value) direction = Math.sign(value - extreme.value);
				extreme = value === extreme.value ? extreme : point;
				return null;
			}
			if ((value - extreme.value) * direction >= 0) {
				extreme = point;
				return null;
			}
			const retreat = Math.abs(value - extreme.value);
			return retreat >= turnConfirmationPx ? confirmTurn(point) : null;
		},
		reset() {
			pivot = null;
			extreme = null;
			direction = 0;
		},
	};
}

export function createDragShakeDetector(overrides: Partial<DragShakeOptions> = {}): ShakeDetector<PointerSample> {
	const options = { ...DEFAULT_DRAG_SHAKE_OPTIONS, ...overrides };
	const trackers = [createAxisTracker(options), createAxisTracker(options)];
	let reversalTimes: number[][] = [[], []];
	let cooldownUntil = -Infinity;

	function reset() {
		trackers.forEach((tracker) => tracker.reset());
		reversalTimes = [[], []];
	}

	return {
		push(sample) {
			if (sample.time < cooldownUntil) return false;
			const values = [sample.x, sample.y];
			let fired = false;
			values.forEach((value, axis) => {
				const reversalTime = trackers[axis].push(value, sample.time);
				const recent = reversalTimes[axis].filter((time) => sample.time - time <= options.windowMs);
				if (reversalTime !== null) recent.push(reversalTime);
				reversalTimes[axis] = recent;
				if (recent.length >= options.reversalsToFire) fired = true;
			});
			if (!fired) return false;
			reset();
			cooldownUntil = sample.time + options.cooldownMs;
			return true;
		},
		reset() {
			reset();
			cooldownUntil = -Infinity;
		},
	};
}

function accelerationChange(from: MotionSample, to: MotionSample): number {
	return Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
}

export function createMotionShakeDetector(overrides: Partial<MotionShakeOptions> = {}): ShakeDetector<MotionSample> {
	const options = { ...DEFAULT_MOTION_SHAKE_OPTIONS, ...overrides };
	let previous: MotionSample | null = null;
	let joltTimes: number[] = [];
	let cooldownUntil = -Infinity;

	function reset() {
		previous = null;
		joltTimes = [];
	}

	function isNewJolt(sample: MotionSample): boolean {
		const lastJoltTime = joltTimes[joltTimes.length - 1] ?? -Infinity;
		return sample.time - lastJoltTime >= options.minJoltGapMs;
	}

	return {
		push(sample) {
			if (sample.time < cooldownUntil) return false;
			const last = previous;
			previous = sample;
			if (last === null) return false;
			joltTimes = joltTimes.filter((time) => sample.time - time <= options.windowMs);
			const isJolt = accelerationChange(last, sample) >= options.joltThreshold;
			if (isJolt && isNewJolt(sample)) joltTimes.push(sample.time);
			if (joltTimes.length < options.joltsToFire) return false;
			reset();
			cooldownUntil = sample.time + options.cooldownMs;
			return true;
		},
		reset() {
			reset();
			cooldownUntil = -Infinity;
		},
	};
}
