import { required } from "../../lib/dom";
import { createDragShakeDetector, createMotionShakeDetector } from "./lib/shake";
import { shakeStarted } from "./lib/oracle";
import type { ShakeMethod, Store } from "./lib/state";
import type { DraggableBall } from "./scene";

const DRAG_NOT_CLICK_PX = 6;
// Shorter than SHAKE_MS, so a phone shaken for a while keeps the ball shaking instead of settling and clouding over.
const PHONE_SHAKE_COOLDOWN_MS = 500;

type PermissionRequester = { requestPermission(): Promise<PermissionState> };

export interface ShakeHooks {
	onMotionPermission(granted: boolean): void;
}

export function mountShakeInputs(store: Store, ball: DraggableBall, hooks: ShakeHooks): void {
	const shake = (method: ShakeMethod) => store.set(shakeStarted(store.get(), method));
	const button = required<HTMLButtonElement>(document, "#m8-ball");

	listenForClicks(button, shake, listenForDrags(button, ball, shake));
	listenForPhoneShakes(required<HTMLButtonElement>(document, "#m8-motion"), shake, hooks);
}

/** Returns whether the last press moved far enough to count as a drag, so its click isn't also a shake. */
function listenForDrags(button: HTMLElement, ball: DraggableBall, shake: (method: ShakeMethod) => void): () => boolean {
	const detector = createDragShakeDetector();
	let origin: { x: number; y: number } | null = null;
	let dragged = false;

	button.addEventListener("pointerdown", (event) => {
		if (event.button !== 0) return;
		button.setPointerCapture(event.pointerId);
		origin = { x: event.clientX, y: event.clientY };
		dragged = false;
		detector.reset();
	});

	button.addEventListener("pointermove", (event) => {
		if (!origin) return;
		const dx = event.clientX - origin.x;
		const dy = event.clientY - origin.y;
		dragged ||= Math.hypot(dx, dy) > DRAG_NOT_CLICK_PX;
		ball.drag(dx, dy);
		if (detector.push({ x: event.clientX, y: event.clientY, time: event.timeStamp })) shake("drag");
	});

	const endDrag = () => {
		if (!origin) return;
		origin = null;
		ball.release();
	};
	button.addEventListener("pointerup", endDrag);
	button.addEventListener("pointercancel", endDrag);

	return () => dragged;
}

function listenForClicks(button: HTMLElement, shake: (method: ShakeMethod) => void, wasDragged: () => boolean): void {
	button.addEventListener("click", (event) => {
		if (event.detail === 0) return shake("keyboard");
		if (!wasDragged()) shake("click");
	});
}

function listenForPhoneShakes(
	permissionButton: HTMLButtonElement,
	shake: (method: ShakeMethod) => void,
	hooks: ShakeHooks,
): void {
	if (typeof DeviceMotionEvent === "undefined") return;
	const motion = DeviceMotionEvent;

	const listen = () => {
		const detector = createMotionShakeDetector({ cooldownMs: PHONE_SHAKE_COOLDOWN_MS });
		addEventListener("devicemotion", (event) => {
			const { x, y, z } = event.accelerationIncludingGravity ?? {};
			if (x == null || y == null || z == null) return;
			if (detector.push({ x, y, z, time: event.timeStamp })) shake("device");
		});
	};

	if (!needsMotionPermission(motion)) return listen();
	if (!matchMedia("(pointer: coarse)").matches) return;

	permissionButton.hidden = false;
	permissionButton.addEventListener("click", async () => {
		const granted = (await motion.requestPermission().catch(() => "denied")) === "granted";
		hooks.onMotionPermission(granted);
		permissionButton.hidden = true;
		if (granted) listen();
	});
}

function needsMotionPermission(
	motion: typeof DeviceMotionEvent,
): motion is typeof DeviceMotionEvent & PermissionRequester {
	return typeof (motion as Partial<PermissionRequester>).requestPermission === "function";
}
