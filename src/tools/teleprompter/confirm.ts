/*
 * A small promise-based confirm, styled like the rest of the tool (window.confirm can't be styled and
 * blocks the page). Used by "Clear script", by Reset, and by a share link that would replace a saved script.
 * The markup is ConfirmDialog.astro, rendered once by the page.
 */
import { required } from "./lib/dom";
import { wireDialog } from "./lib/dialog";

export interface ConfirmOptions {
	title: string;
	body?: string;
	confirmLabel: string;
	cancelLabel?: string;
	/** Style the confirm button as destructive. */
	destructive?: boolean;
}

interface Parts {
	dialog: HTMLDialogElement;
	title: HTMLElement;
	body: HTMLElement;
	confirmButton: HTMLElement;
	cancelButton: HTMLElement;
	confirmLabel: HTMLElement;
	cancelLabel: HTMLElement;
}

let parts: Parts | null | undefined;
let settle: ((confirmed: boolean) => void) | null = null;

/** Finds and wires the dialog on first use. null when the page has none. */
function mount(): Parts | null {
	if (parts !== undefined) return parts;
	const dialog = document.querySelector<HTMLDialogElement>("[data-tp-confirm]");
	if (!dialog || typeof dialog.showModal !== "function") return (parts = null);

	const part = (name: string) => required(dialog, `[data-tpc="${name}"]`);
	const confirmButton = part("confirm");
	const cancelButton = part("cancel");
	const answer = (confirmed: boolean) => {
		const resolve = settle;
		settle = null;
		if (dialog.open) dialog.close();
		resolve?.(confirmed);
	};
	confirmButton.addEventListener("click", () => answer(true));
	cancelButton.addEventListener("click", () => answer(false));
	// Esc or a backdrop click closes the dialog without an answer: that is a no.
	wireDialog(dialog, { onClose: () => answer(false) });

	return (parts = {
		dialog,
		title: part("title"),
		body: part("body"),
		confirmButton,
		cancelButton,
		confirmLabel: required(confirmButton, ".sd-btn__label"),
		cancelLabel: required(cancelButton, ".sd-btn__label"),
	});
}

/** Resolves true on confirm; false on cancel, Esc or a backdrop click. */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
	const ui = mount();
	if (!ui) {
		// No dialog markup (or a very old browser): fall back to the browser's own confirm.
		return Promise.resolve(window.confirm([options.title, options.body].filter(Boolean).join("\n\n")));
	}
	const { dialog } = ui;

	// A second question while one is open cancels the first, and takes over the open dialog.
	settle?.(false);

	ui.title.textContent = options.title;
	ui.body.textContent = options.body ?? "";
	ui.confirmLabel.textContent = options.confirmLabel;
	ui.cancelLabel.textContent = options.cancelLabel ?? "Cancel";
	const destructive = Boolean(options.destructive);
	ui.confirmButton.classList.toggle("sd-btn--danger", destructive);
	ui.confirmButton.classList.toggle("sd-btn--primary", !destructive);

	return new Promise<boolean>((resolve) => {
		settle = resolve;
		if (!dialog.open) dialog.showModal();
		// A destructive question starts on the safe answer.
		(destructive ? ui.cancelButton : ui.confirmButton).focus();
	});
}
