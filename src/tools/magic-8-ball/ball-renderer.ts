import { clamp, lerp } from "../../lib/math";
import { loadAnswerFont } from "./answer-face";
import { loadBallWebGL, type BallPose, type BallWebGL } from "./ball-webgl";
import type { Answer } from "./lib/answers";
import {
	IDENTITY_QUATERNION,
	multiplyQuaternions,
	quaternionFromAxisAngle,
	quaternionFromEuler,
	slerp,
	type Quaternion,
} from "./lib/transform";

export interface BallRenderer {
	/** Shows the 8 side for a beat, then turns to the window. Shaking turns it at once. */
	introduce(): void;
	shake(intensity: number): void;
	drag(dx: number, dy: number): void;
	release(): void;
	reveal(answer: Answer): Promise<void>;
	dispose(): void;
}

interface BallRendererOptions {
	reducedMotion: boolean;
}

const MAX_FRAME_SECONDS = 0.05;
const MAX_AGITATION = 1.6;
const AGITATION_DECAY_PER_SECOND = 0.7;
const ANSWER_FACE_RISEN_Z = 0.79;
const ANSWER_FACE_SUNK_Z = 0.4;
const DIE_RISEN_SCALE = 1.6;
const DIE_SUNK_SCALE = 1;
const DIE_RESTING_TILT = quaternionFromEuler(0.7, -1.1, 0.5);
const ANSWER_FACING_GLASS = IDENTITY_QUATERNION;
const TUMBLE_RADIANS_PER_SECOND = 9;
const INTRO_HOLD_SECONDS = 0.8;
const INTRO_TURN_SECONDS = 1.4;
const HURRIED_TURN_SECONDS = 0.45;
const HAZY_TEXT_ALPHA = 0.7;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const secondsNow = () => performance.now() / 1000;

class Track {
	private from: number;
	private to: number;
	private startedAt = 0;
	private duration = 0;
	private ease: (t: number) => number = easeInOut;

	constructor(private current: number) {
		this.from = current;
		this.to = current;
	}

	get value() {
		return this.current;
	}

	get isRunning() {
		return this.current !== this.to;
	}

	jumpTo(value: number) {
		this.from = this.to = this.current = value;
	}

	animateTo(target: number, duration: number, delay = 0, ease = easeInOut) {
		this.from = this.current;
		this.to = target;
		this.startedAt = secondsNow() + delay;
		this.duration = duration;
		this.ease = ease;
	}

	update(now: number) {
		if (!this.isRunning) return;
		const progress = clamp((now - this.startedAt) / this.duration, 0, 1);
		this.current = progress >= 1 ? this.to : lerp(this.from, this.to, this.ease(progress));
	}
}

class Spring {
	value = 0;
	target = 0;
	private velocity = 0;

	constructor(
		private readonly stiffness: number,
		private readonly damping: number,
	) {}

	get isAtRest() {
		return Math.abs(this.velocity) < 0.0005 && Math.abs(this.target - this.value) < 0.0005;
	}

	step(seconds: number) {
		const substeps = Math.ceil(seconds / (1 / 120));
		const dt = seconds / substeps;
		for (let i = 0; i < substeps; i++) {
			const acceleration = this.stiffness * (this.target - this.value) - this.damping * this.velocity;
			this.velocity += acceleration * dt;
			this.value += this.velocity * dt;
		}
		if (this.isAtRest) {
			this.value = this.target;
			this.velocity = 0;
		}
	}
}

export async function createBallRenderer(
	canvas: HTMLCanvasElement,
	{ reducedMotion }: BallRendererOptions,
): Promise<BallRenderer> {
	return assembleBallRenderer(await loadBallWebGL(canvas), canvas, reducedMotion);
}

function assembleBallRenderer(webgl: BallWebGL, canvas: HTMLCanvasElement, reducedMotion: boolean): BallRenderer {
	const positionX = new Spring(90, 11);
	const positionY = new Spring(90, 11);
	const tiltX = new Spring(70, 9);
	const tiltY = new Spring(70, 9);
	const springs = [positionX, positionY, tiltX, tiltY];
	const depth = new Track(0);
	const textAlpha = new Track(0);
	const answerFacing = new Track(0);
	const haze = new Track(0);
	const turnFromWindow = new Track(0);
	const tracks = [depth, textAlpha, answerFacing, haze, turnFromWindow];
	let dieTumble: Quaternion = DIE_RESTING_TILT;
	let agitation = 0;
	let pendingReveal: (() => void) | null = null;
	let frameHandle: number | null = null;
	let lastFrameTime: number | null = null;
	let disposed = false;

	function resize(entries: ResizeObserverEntry[]) {
		const { width, height } = entries[0].contentRect;
		if (width < 1 || height < 1) return;
		webgl.resize(width, height);
		requestFrame();
	}

	function ballPlacement(now: number): Pick<BallPose, "ballPosition" | "ballRotation"> {
		return {
			ballPosition: [
				positionX.value + Math.sin(now * 41) * 0.045 * agitation,
				positionY.value + Math.sin(now * 37 + 1) * 0.045 * agitation,
				0,
			],
			ballRotation: quaternionFromEuler(
				tiltX.value + Math.sin(now * 29 + 2) * 0.16 * agitation,
				tiltY.value + turnFromWindow.value + Math.sin(now * 23 + 4) * 0.16 * agitation,
				Math.sin(now * 33 + 3) * 0.13 * agitation,
			),
		};
	}

	/** The die tumbles freely until it starts turning to the answer, so that turn always starts from a fixed pose. */
	function tumbleDie(seconds: number, now: number) {
		if (agitation === 0 || answerFacing.value > 0) return;
		const axis = [Math.sin(now * 1.3), Math.cos(now * 1.3), Math.sin(now * 0.7)] as const;
		const step = quaternionFromAxisAngle(axis, agitation * TUMBLE_RADIANS_PER_SECOND * seconds);
		dieTumble = multiplyQuaternions(step, dieTumble);
	}

	function dieRotation() {
		return slerp(dieTumble, ANSWER_FACING_GLASS, answerFacing.value);
	}

	function diePlacement(): Pick<BallPose, "answerFaceZ" | "dieRotation" | "dieScale"> {
		const rise = easeOutCubic(depth.value);
		return {
			answerFaceZ: lerp(ANSWER_FACE_SUNK_Z, ANSWER_FACE_RISEN_Z, rise),
			dieRotation: dieRotation(),
			dieScale: lerp(DIE_SUNK_SCALE, DIE_RISEN_SCALE, rise),
		};
	}

	function updateMotion(seconds: number, now: number) {
		for (const spring of springs) spring.step(seconds);
		for (const track of tracks) track.update(now);
		tumbleDie(seconds, now);
		agitation = Math.max(0, agitation - AGITATION_DECAY_PER_SECOND * seconds);
	}

	function isMoving() {
		return agitation > 0 || tracks.some((track) => track.isRunning) || springs.some((spring) => !spring.isAtRest);
	}

	function settlePendingReveal() {
		pendingReveal?.();
		pendingReveal = null;
	}

	function renderFrame(time: number) {
		frameHandle = null;
		const now = time / 1000;
		const seconds = lastFrameTime === null ? 1 / 60 : Math.min(now - lastFrameTime, MAX_FRAME_SECONDS);
		lastFrameTime = now;
		updateMotion(seconds, now);
		webgl.draw({ ...ballPlacement(now), ...diePlacement(), answerOpacity: textAlpha.value, haze: haze.value });
		if (isMoving()) {
			requestFrame();
			return;
		}
		lastFrameTime = null;
		settlePendingReveal();
	}

	function requestFrame() {
		if (disposed || frameHandle !== null || document.hidden) return;
		frameHandle = requestAnimationFrame(renderFrame);
	}

	function stopFrames() {
		if (frameHandle !== null) cancelAnimationFrame(frameHandle);
		frameHandle = null;
		lastFrameTime = null;
	}

	function onVisibilityChange() {
		if (document.hidden) stopFrames();
		else requestFrame();
	}

	function sinkDie() {
		const seconds = reducedMotion ? 0.2 : 0.45;
		depth.animateTo(0, seconds);
		textAlpha.animateTo(0, 0.25);
		dieTumble = dieRotation();
		answerFacing.jumpTo(0);
	}

	function hurryToWindow() {
		if (turnFromWindow.isRunning) turnFromWindow.animateTo(0, HURRIED_TURN_SECONDS);
	}

	function introduce() {
		if (reducedMotion) return;
		turnFromWindow.jumpTo(Math.PI);
		turnFromWindow.animateTo(0, INTRO_TURN_SECONDS, INTRO_HOLD_SECONDS);
		requestFrame();
	}

	async function reveal(answer: Answer) {
		settlePendingReveal();
		await loadAnswerFont();
		if (disposed) return;
		webgl.showAnswer(answer.text);
		const hazy = answer.tone === "hazy";
		haze.animateTo(hazy ? 1 : 0, 0.6);
		const finalTextAlpha = hazy ? HAZY_TEXT_ALPHA : 1;
		if (reducedMotion) {
			depth.jumpTo(1);
			answerFacing.jumpTo(1);
			textAlpha.animateTo(finalTextAlpha, 0.3);
		} else {
			depth.animateTo(1, 1.5, 0, easeOutCubic);
			answerFacing.animateTo(1, 1.7, 0, easeOutCubic);
			textAlpha.animateTo(finalTextAlpha, 1.3, 0.4);
		}
		const settled = new Promise<void>((resolve) => {
			pendingReveal = resolve;
		});
		requestFrame();
		return settled;
	}

	function shake(intensity: number) {
		const clamped = clamp(intensity, 0, 1);
		if (!reducedMotion) agitation = Math.min(MAX_AGITATION, agitation + 0.5 + clamped * 0.7);
		settlePendingReveal();
		hurryToWindow();
		sinkDie();
		requestFrame();
	}

	function drag(dx: number, dy: number) {
		const limit = 0.45;
		positionX.target = clamp(dx * webgl.unitsPerPixel * 0.5, -limit, limit);
		positionY.target = clamp(-dy * webgl.unitsPerPixel * 0.5, -limit, limit);
		tiltY.target = clamp(dx * 0.004, -0.7, 0.7);
		tiltX.target = clamp(dy * 0.004, -0.7, 0.7);
		requestFrame();
	}

	function release() {
		for (const spring of springs) spring.target = 0;
		requestFrame();
	}

	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(canvas);
	document.addEventListener("visibilitychange", onVisibilityChange);

	function dispose() {
		disposed = true;
		stopFrames();
		settlePendingReveal();
		resizeObserver.disconnect();
		document.removeEventListener("visibilitychange", onVisibilityChange);
		webgl.dispose();
	}

	return { introduce, shake, drag, release, reveal, dispose };
}
