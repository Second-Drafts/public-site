export function wireDialog(dialog: HTMLDialogElement, { onClose }: { onClose?: () => void } = {}): void {
	// The panel fills the dialog's box, so a click that lands on the dialog element itself hit the backdrop.
	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) dialog.close();
	});
	dialog.addEventListener("close", () => {
		// Opened again before this event arrived (a second question replacing the first): it isn't ours.
		if (!dialog.open) onClose?.();
	});
}
