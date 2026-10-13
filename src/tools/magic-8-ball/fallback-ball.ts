import { required } from "../../lib/dom";
import type { BallRenderer } from "./ball-renderer";
import type { Answer } from "./lib/answers";

const REVEAL_MS = 1200;
const REDUCED_REVEAL_MS = 300;
const WOBBLE_MS = 900;
const WOBBLE_KEYFRAMES: Keyframe[] = [
	{ rotate: "0deg" },
	{ rotate: "-9deg", translate: "-4% 1%" },
	{ rotate: "8deg", translate: "4% -1%" },
	{ rotate: "-6deg", translate: "-3% 0" },
	{ rotate: "3deg", translate: "2% 0" },
	{ rotate: "0deg" },
];

/** The CSS ball: shown while the 3D model loads, and kept when WebGL or the model isn't available. */
export function createFallbackBall(element: HTMLElement, { reducedMotion }: { reducedMotion: boolean }): BallRenderer {
	const text = required(element, ".m8-fallback__text");
	const revealMs = reducedMotion ? REDUCED_REVEAL_MS : REVEAL_MS;

	const wobble = () =>
		element.animate(WOBBLE_KEYFRAMES, { duration: WOBBLE_MS, easing: "ease-in-out", composite: "add" });

	return {
		shake() {
			element.classList.remove("is-revealed");
			if (!reducedMotion) wobble();
		},
		drag(dx, dy) {
			element.style.translate = `${dx * 0.25}px ${dy * 0.25}px`;
		},
		release() {
			element.style.translate = "";
		},
		reveal(answer: Answer) {
			text.textContent = answer.text;
			element.dataset.tone = answer.tone;
			element.classList.add("is-revealed");
			return new Promise((resolve) => setTimeout(resolve, revealMs));
		},
		dispose() {},
	};
}
