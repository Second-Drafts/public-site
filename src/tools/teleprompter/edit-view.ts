import { askConfirm } from "./confirm";
import { required } from "./lib/dom";
import type { Store } from "./lib/store";
import { countWords, formatReadTime, readTimeSeconds } from "./lib/timing";

export interface EditHooks {
	onScriptInput(source: "paste" | "typed"): void;
	onShareCopied(tooLong: boolean): void;
}

const wordCountFormat = new Intl.NumberFormat("en");

function statsText(script: string): string {
	const words = countWords(script);
	if (words === 0) return "No words yet. Paste or type a script to begin.";
	const count = `${wordCountFormat.format(words)} ${words === 1 ? "word" : "words"}`;
	const time = formatReadTime(readTimeSeconds(words));
	return `${count} · ${time} to read`;
}

const NOTICE_MS = 10_000;
const COPIED_MS = 2_000;

export interface EditView {
	showNotice(message: string): void;
}

export function mountEditView(store: Store, hooks: EditHooks): EditView {
	const root = required(document, "[data-tp-edit]");
	const part = <T extends HTMLElement = HTMLElement>(name: string) => required<T>(root, `[data-tpe="${name}"]`);
	const textarea = part<HTMLTextAreaElement>("script");
	const stats = part("stats");
	const start = required<HTMLButtonElement>(document, '[data-tpe="start"]');
	const share = required<HTMLButtonElement>(document, '[data-tpe="share"]');
	const shareLabel = required(share, '[data-tpe="share-label"]');
	const shareText = shareLabel.textContent;
	const clear = part<HTMLButtonElement>("clear");
	const status = part("status");
	const fallback = part("fallback");
	const link = part<HTMLInputElement>("link");

	let noticeTimer: ReturnType<typeof setTimeout> | undefined;
	let copiedTimer: ReturnType<typeof setTimeout> | undefined;
	let noticeShown = false;

	function clearFeedback() {
		clearTimeout(noticeTimer);
		noticeShown = false;
		if (status.textContent !== "") status.textContent = "";
		if (status.hasAttribute("data-tone")) status.removeAttribute("data-tone");
		if (!fallback.hidden) {
			fallback.hidden = true;
			link.value = "";
		}
	}

	function showNotice(message: string) {
		clearFeedback();
		status.textContent = message;
		status.dataset.tone = "warning";
		noticeShown = true;
		noticeTimer = setTimeout(clearFeedback, NOTICE_MS);
	}

	function render() {
		const { script } = store.get();
		// Only touch the textarea when the value really differs, so the caret stays where it is while typing.
		if (textarea.value !== script) textarea.value = script;
		stats.textContent = statsText(script);
		const blank = script.trim() === "";
		start.disabled = blank;
		share.disabled = blank;
		clear.disabled = script === "";
	}

	textarea.addEventListener("input", (event) => {
		store.set({ script: textarea.value });
		hooks.onScriptInput((event as InputEvent).inputType === "insertFromPaste" ? "paste" : "typed");
	});

	start.addEventListener("click", () => store.set({ view: "prompt" }));

	clear.addEventListener("click", async () => {
		const confirmed = await askConfirm({
			title: "Clear your script?",
			body: "This removes it from this browser. You can't undo it.",
			confirmLabel: "Clear script",
			cancelLabel: "Keep it",
			destructive: true,
		});
		if (!confirmed) return;
		store.set({ script: "" });
		textarea.focus();
	});

	// Preloaded when idle, so the click awaits a settled import and the clipboard write keeps its user gesture.
	let shareModule: Promise<typeof import("./lib/share")> | undefined;
	const loadShare = () => (shareModule ??= import("./lib/share"));
	(window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 1000)))(() => void loadShare());

	share.addEventListener("click", async () => {
		const { script, settings } = store.get();
		const { buildShareUrl } = await loadShare();
		const { url, tooLong } = buildShareUrl(location.origin + location.pathname, { script, settings });
		clearFeedback();

		let copied = false;
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
		} catch {
		}

		const warning = tooLong
			? " This link is very long, and some apps may cut off long links. Check that it opens before you send it."
			: "";
		if (copied) {
			status.textContent = `Link copied. Anyone with it can open your script and settings.${warning}`;
			clearTimeout(copiedTimer);
			shareLabel.textContent = "Link copied";
			copiedTimer = setTimeout(() => (shareLabel.textContent = shareText), COPIED_MS);
		} else {
			status.textContent = `We couldn't copy the link for you. Copy it from the box below.${warning}`;
			link.value = url;
			fallback.hidden = false;
			link.focus();
			link.select();
		}
		if (tooLong) status.dataset.tone = "warning";
		hooks.onShareCopied(tooLong);
	});

	store.subscribe((state, previous) => {
		const scriptChanged = state.script !== previous.script;
		const settingsChanged = state.settings !== previous.settings;
		if (scriptChanged || (settingsChanged && !noticeShown)) clearFeedback();
		if (scriptChanged) render();
	});
	render();
	return { showNotice };
}
