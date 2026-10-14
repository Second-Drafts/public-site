import { required } from "../../lib/dom";
import type { BallRenderer } from "./ball-renderer";
import { createFallbackBall } from "./fallback-ball";
import type { Answer } from "./lib/answers";
import { answerChosen, answerSettled } from "./lib/oracle";
import type { ShakeMethod, State, Store } from "./lib/state";

/** How long the ball keeps shaking after the last shake or drag movement before it starts to settle. */
const SHAKE_MS = 900;
const REDUCED_SHAKE_MS = 600;
const SHAKE_INTENSITY: Record<ShakeMethod, number> = { submit: 0.7, click: 0.7, keyboard: 0.7, drag: 1, device: 1 };

export interface DraggableBall {
	drag(dx: number, dy: number): void;
	release(): void;
}

export function mountScene(store: Store): DraggableBall {
	const button = required(document, "#m8-ball");
	const canvas = required<HTMLCanvasElement>(button, "#m8-canvas");
	const answerRegion = required(document, "#m8-answer");
	const shareOpen = required<HTMLButtonElement>(document, "#m8-share-open");
	const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

	let ball: BallRenderer = createFallbackBall(required(button, ".m8-fallback"), { reducedMotion });
	let answerTimer: ReturnType<typeof setTimeout> | undefined;

	void loadModelBall(canvas, reducedMotion).then((modelBall) => {
		if (modelBall) useModelBall(modelBall);
		if (store.get().phase === "idle") ball.introduce();
	});

	function useModelBall(modelBall: BallRenderer) {
		ball = modelBall;
		button.classList.add("has-model");
		const { phase, reading } = store.get();
		if (reading && phase !== "shaking") void ball.reveal(reading.answer);
	}

	function chooseAnswerAfterShaking() {
		clearTimeout(answerTimer);
		answerTimer = setTimeout(
			() => store.set(answerChosen(store.get()), "system"),
			reducedMotion ? REDUCED_SHAKE_MS : SHAKE_MS,
		);
	}

	async function settle(answer: Answer) {
		await ball.reveal(answer);
		store.set(answerSettled(store.get(), answer), "system");
	}

	function render(state: Readonly<State>, previous: Readonly<State>) {
		if (state.shake !== previous.shake && state.phase === "shaking") {
			ball.shake(SHAKE_INTENSITY[state.shake!.method]);
			chooseAnswerAfterShaking();
		}
		if (state.reading !== previous.reading && state.reading) void settle(state.reading.answer);
		if (state.phase === "revealed" && previous.phase !== "revealed")
			answerRegion.textContent = state.reading!.answer.text;
		shareOpen.hidden = state.phase !== "revealed";
	}

	store.subscribe(render);

	return {
		drag(dx, dy) {
			ball.drag(dx, dy);
			if (store.get().phase === "shaking") chooseAnswerAfterShaking();
		},
		release: () => ball.release(),
	};
}

async function loadModelBall(canvas: HTMLCanvasElement, reducedMotion: boolean): Promise<BallRenderer | null> {
	try {
		const { createBallRenderer } = await import("./ball-renderer");
		return await createBallRenderer(canvas, { reducedMotion });
	} catch {
		return null;
	}
}
