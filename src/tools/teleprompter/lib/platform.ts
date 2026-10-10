/*
 * Browser features the Prompt view leans on, each feature-detected and failing silently.
 * Fullscreen uses the webkit prefix on older Safari (iPadOS before 16.4). iPhone Safari has no
 * element fullscreen; there the full-viewport overlay is the fallback and the button is hidden.
 * The browser drops the wake lock whenever the page is hidden, so it is requested again on return.
 */

type WebkitDocument = Document & {
	webkitFullscreenEnabled?: boolean;
	webkitFullscreenElement?: Element | null;
	webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitElement = HTMLElement & {
	webkitRequestFullscreen?: () => Promise<void> | void;
};

const doc = () => document as WebkitDocument;

export function fullscreenSupported(): boolean {
	if (typeof document === "undefined") return false;
	return Boolean(document.fullscreenEnabled || doc().webkitFullscreenEnabled);
}

export function fullscreenElement(): Element | null {
	return document.fullscreenElement ?? doc().webkitFullscreenElement ?? null;
}

async function enterFullscreen(element: HTMLElement): Promise<void> {
	const el = element as WebkitElement;
	try {
		if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: "hide" });
		else await el.webkitRequestFullscreen?.();
	} catch {
		// Refused (no user gesture, permissions policy, iframe): stay in the overlay.
	}
}

export async function exitFullscreen(): Promise<void> {
	if (!fullscreenElement()) return;
	try {
		if (document.exitFullscreen) await document.exitFullscreen();
		else await doc().webkitExitFullscreen?.();
	} catch {
		// Already left, or the browser refused: nothing to do.
	}
}

export function toggleFullscreen(element: HTMLElement): Promise<void> {
	return fullscreenElement() ? exitFullscreen() : enterFullscreen(element);
}

export function onFullscreenChange(callback: () => void): () => void {
	document.addEventListener("fullscreenchange", callback);
	document.addEventListener("webkitfullscreenchange", callback);
	return () => {
		document.removeEventListener("fullscreenchange", callback);
		document.removeEventListener("webkitfullscreenchange", callback);
	};
}

export interface WakeLock {
	/** Hold the screen awake until release(). Safe to call repeatedly. */
	acquire(): void;
	release(): void;
}

export function createWakeLock(): WakeLock {
	let wanted = false;
	let sentinel: WakeLockSentinel | null = null;
	let pending = false;

	const supported = () => typeof navigator !== "undefined" && "wakeLock" in navigator;

	async function request() {
		if (!wanted || sentinel || pending || !supported() || document.visibilityState !== "visible") return;
		pending = true;
		try {
			const lock = await navigator.wakeLock.request("screen");
			if (!wanted) {
				void lock.release().catch(() => undefined);
				return;
			}
			sentinel = lock;
			lock.addEventListener("release", () => {
				if (sentinel === lock) sentinel = null;
			});
		} catch {
			// Denied (battery saver, permissions policy) or unsupported: the screen may sleep.
		} finally {
			pending = false;
		}
	}

	const onVisibility = () => {
		if (document.visibilityState === "visible") void request();
	};

	return {
		acquire() {
			if (wanted) return;
			wanted = true;
			document.addEventListener("visibilitychange", onVisibility);
			void request();
		},
		release() {
			wanted = false;
			document.removeEventListener("visibilitychange", onVisibility);
			const lock = sentinel;
			sentinel = null;
			void lock?.release().catch(() => undefined);
		},
	};
}
