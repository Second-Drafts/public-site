import { wireDialog } from "../../lib/dialog";
import { required } from "../../lib/dom";
import { describeReading, drawShareCard, loadShareCardFonts, SHARE_CARD_SIZE } from "./lib/share-card";
import type { Store } from "./lib/state";

export type ShareMethod = "copy" | "share" | "download";

interface ShareHooks {
	onShared(method: ShareMethod): void;
}

const FILE_NAME = "magic-8-ball.png";
const PNG = "image/png";

const STATUS_AFTER_SUCCESS: Record<ShareMethod, string> = {
	copy: "Copied. Filed to your clipboard.",
	download: `Saved as ${FILE_NAME}.`,
	share: "Sent.",
};
const COPY_FAILED = "That didn't copy. Try Download instead.";

function canCopyImages(): boolean {
	return "ClipboardItem" in window && Boolean(navigator.clipboard?.write);
}

function canShareImages(): boolean {
	return Boolean(navigator.canShare?.({ files: [new File([], FILE_NAME, { type: PNG })] }));
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
	return new Promise((resolve, reject) =>
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas produced no image"))), PNG),
	);
}

function isAbort(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}

export function mountShareDialog(store: Store, hooks: ShareHooks): void {
	const dialog = required<HTMLDialogElement>(document, "#m8-share");
	const canvas = required<HTMLCanvasElement>(dialog, "#m8-share-canvas");
	const status = required(dialog, "#m8-share-status");
	const copyButton = required(dialog, "#m8-share-copy");
	const shareButton = required(dialog, "#m8-share-native");
	const downloadButton = required(dialog, "#m8-share-download");
	const context = canvas.getContext("2d");
	if (!context) return;

	let cardBlob: Promise<Blob> = Promise.reject(new Error("No card drawn"));
	cardBlob.catch(() => {});

	copyButton.hidden = !canCopyImages();
	shareButton.hidden = !canShareImages();

	function succeed(method: ShareMethod) {
		status.textContent = STATUS_AFTER_SUCCESS[method];
		hooks.onShared(method);
	}

	async function open() {
		const { reading } = store.get();
		if (!reading || !context) return;
		status.textContent = "";
		canvas.setAttribute("aria-label", describeReading(reading));
		dialog.showModal();
		cardBlob = loadShareCardFonts().then(() => {
			drawShareCard(context, reading, SHARE_CARD_SIZE);
			return canvasToBlob(canvas);
		});
		cardBlob.catch(() => {});
	}

	function copy() {
		status.textContent = "";
		const item = new ClipboardItem({ [PNG]: cardBlob });
		navigator.clipboard
			.write([item])
			.then(() => succeed("copy"))
			.catch(() => (status.textContent = COPY_FAILED));
	}

	async function share() {
		status.textContent = "";
		try {
			const file = new File([await cardBlob], FILE_NAME, { type: PNG });
			await navigator.share({ files: [file] });
			succeed("share");
		} catch (error) {
			if (!isAbort(error)) status.textContent = "That didn't send. Try Download instead.";
		}
	}

	async function download() {
		status.textContent = "";
		try {
			const url = URL.createObjectURL(await cardBlob);
			const link = Object.assign(document.createElement("a"), { download: FILE_NAME, href: url });
			link.click();
			URL.revokeObjectURL(url);
			succeed("download");
		} catch {
			status.textContent = "That didn't save. Try again.";
		}
	}

	required(document, "#m8-share-open").addEventListener("click", open);
	required(dialog, "#m8-share-close").addEventListener("click", () => dialog.close());
	copyButton.addEventListener("click", copy);
	shareButton.addEventListener("click", share);
	downloadButton.addEventListener("click", download);
	wireDialog(dialog);
}
