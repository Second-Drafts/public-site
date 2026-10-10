export interface SettingsDrawer {
	isOpen(): boolean;
	close(focusTo?: HTMLElement | null): void;
	toggle(): void;
}

export interface SettingsDrawerOptions {
	host: HTMLElement;
	drawer: HTMLElement;
	toggleButton: HTMLButtonElement;
	closeButton: HTMLButtonElement;
	background: HTMLElement[];
	onOpenChange(): void;
}

export function createSettingsDrawer(options: SettingsDrawerOptions): SettingsDrawer {
	const { host, drawer, toggleButton, background } = options;
	let isOpen = false;

	function open() {
		if (isOpen) return;
		isOpen = true;
		host.dataset.drawer = "open";
		toggleButton.setAttribute("aria-expanded", "true");
		drawer.hidden = false;
		for (const element of background) element.inert = true;
		options.onOpenChange();
		drawer.focus({ preventScroll: true });
	}

	function close(focusTo: HTMLElement | null = toggleButton) {
		if (!isOpen) return;
		isOpen = false;
		delete host.dataset.drawer;
		toggleButton.setAttribute("aria-expanded", "false");
		for (const element of background) element.inert = false;
		drawer.hidden = true;
		focusTo?.focus({ preventScroll: true });
		options.onOpenChange();
	}

	function toggle() {
		if (isOpen) close();
		else open();
	}

	toggleButton.addEventListener("click", toggle);
	options.closeButton.addEventListener("click", () => close());
	host.addEventListener(
		"pointerdown",
		(event) => {
			if (isOpen && !(event.target instanceof Node && drawer.contains(event.target))) close(host);
		},
		{ passive: true },
	);

	return { isOpen: () => isOpen, close, toggle };
}
