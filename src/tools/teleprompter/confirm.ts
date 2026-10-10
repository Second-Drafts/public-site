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

let parts: Parts | undefined;
let settle: ((confirmed: boolean) => void) | null = null;

function mount(): Parts {
	if (parts) return parts;
	const dialog = required<HTMLDialogElement>(document, "[data-tp-confirm]");

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
	// Esc or a backdrop click closes without an answer: that is a no.
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
