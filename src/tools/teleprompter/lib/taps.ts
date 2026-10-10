export const TAP_MAX_MOVE_PX = 10;
export const TAP_MAX_MS = 500;

export function isTap(dx: number, dy: number, durationMs: number): boolean {
	return Math.hypot(dx, dy) < TAP_MAX_MOVE_PX && durationMs >= 0 && durationMs <= TAP_MAX_MS;
}

export const DOUBLE_TAP_MS = 350;
export const DOUBLE_TAP_MAX_PX = 30;

export function isDoubleTap(
	previous: { t: number; x: number; y: number } | null,
	current: { t: number; x: number; y: number },
): boolean {
	if (!previous) return false;
	return (
		current.t - previous.t <= DOUBLE_TAP_MS &&
		Math.hypot(current.x - previous.x, current.y - previous.y) <= DOUBLE_TAP_MAX_PX
	);
}

export interface PointerSample {
	id: number;
	x: number;
	y: number;
	t: number;
}

export interface Press extends PointerSample {
	target: EventTarget | null;
	ignored: boolean;
}

export interface TapHandlers {
	onTap(): void;
	onDoubleTap(target: EventTarget | null): void;
}

export interface TapRecognizer {
	press(press: Press): void;
	release(release: PointerSample): void;
	cancel(): void;
}

export function createTapRecognizer(handlers: TapHandlers): TapRecognizer {
	let current: Press | null = null;
	let lastTap: PointerSample | null = null;

	function release(release: PointerSample) {
		const pressed = current;
		current = null;
		if (!pressed || pressed.id !== release.id || pressed.ignored) return;
		if (!isTap(release.x - pressed.x, release.y - pressed.y, release.t - pressed.t)) return;
		if (isDoubleTap(lastTap, release)) {
			lastTap = null;
			handlers.onDoubleTap(pressed.target);
			return;
		}
		lastTap = release;
		handlers.onTap();
	}

	return {
		press(press) {
			current = press;
		},
		release,
		cancel() {
			current = null;
		},
	};
}

export interface TapListenerOptions extends TapHandlers {
	ignorePress(): boolean;
}

export function listenForTaps(element: HTMLElement, options: TapListenerOptions): void {
	const recognizer = createTapRecognizer(options);
	const sample = (event: PointerEvent): PointerSample => ({
		id: event.pointerId,
		x: event.clientX,
		y: event.clientY,
		t: event.timeStamp,
	});

	element.addEventListener("pointerdown", (event) => {
		if (!event.isPrimary || event.button !== 0) return;
		recognizer.press({ ...sample(event), target: event.target, ignored: options.ignorePress() });
	});
	element.addEventListener("pointerup", (event) => recognizer.release(sample(event)));
	element.addEventListener("pointercancel", () => recognizer.cancel());
}
