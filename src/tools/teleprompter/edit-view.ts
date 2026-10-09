/*
 * Edit view: the script textarea, word count and read time, Start prompting, Copy share link, Clear.
 * Markup: EditView.astro. All text from the user goes in through .value / .textContent, never as HTML.
 */
import { askConfirm } from "./confirm";
import { required } from "./lib/dom";
import type { Store } from "./lib/store";
import { countWords, formatReadTime, readTimeSeconds } from "./lib/timing";

export interface EditHooks {
	/** The user changed the script by pasting or typing. main.ts debounces and reports it. */
	onScriptInput(source: "paste" | "typed"): void;
	/** A share link was copied (or shown for manual copy). */
	onShareCopied(tooLong: boolean): void;
}

const number = new Intl.NumberFormat("en");

/** "312 words · About 2 min to read". Zero and one word read naturally. */
function statsText(script: string): string {
	const words = countWords(script);
	if (words === 0) return "No words yet. Paste or type a script to begin.";
	const count = `${number.format(words)} ${words === 1 ? "word" : "words"}`;
	const time = formatReadTime(readTimeSeconds(words));
	return `${count} · ${time} to read`;
}

/** How long a notice stays before it clears by itself. */
const NOTICE_MS = 10_000;

/** Set when the Edit view mounts, which happens before anything calls showNotice. */
let showNoticeNow: ((message: string) => void) | undefined;

/**
 * Show a short message in the Edit view's live status line, next to the actions. It clears on the next
 * script edit or after about ten seconds. Call it after mountEditView.
 */
export function showNotice(message: string): void {
	showNoticeNow?.(message);
}

export function mountEditView(store: Store, hooks: EditHooks): void {
	const root = required(document, "[data-tp-edit]");
	const part = <T extends HTMLElement = HTMLElement>(name: string) => required<T>(root, `[data-tpe="${name}"]`);
	const textarea = part<HTMLTextAreaElement>("script");
	const stats = part("stats");
	const start = part<HTMLButtonElement>("start");
	const share = part<HTMLButtonElement>("share");
	const clear = part<HTMLButtonElement>("clear");
	const status = part("status");
	const fallback = part("fallback");
	const link = part<HTMLInputElement>("link");

	let noticeTimer: ReturnType<typeof setTimeout> | undefined;
	let noticeShown = false;

	function clearFeedback() {
		clearTimeout(noticeTimer);
		noticeShown = false;
		// Writes only when there is something to clear: this runs on every keystroke.
		if (status.textContent !== "") status.textContent = "";
		if (status.hasAttribute("data-tone")) status.removeAttribute("data-tone");
		if (!fallback.hidden) {
			fallback.hidden = true;
			link.value = "";
		}
	}

	showNoticeNow = (message) => {
		clearFeedback();
		status.textContent = message;
		status.dataset.tone = "warning";
		noticeShown = true;
		noticeTimer = setTimeout(clearFeedback, NOTICE_MS);
	};

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

	// lz-string only matters once someone shares, so it stays off the first load: fetched when the
	// page is idle, so a click only awaits an already-settled import and the copy keeps its user gesture.
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
			// Blocked or unsupported: show the link so it can be copied by hand.
		}

		const warning = tooLong
			? " This link is very long, and some apps may cut off long links. Check that it opens before you send it."
			: "";
		if (copied) {
			status.textContent = `Link copied. Anyone with it can open your script and settings.${warning}`;
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
		// A notice is about the page, not the share link, so only a script edit clears it early.
		if (state.script !== previous.script || (state.settings !== previous.settings && !noticeShown)) clearFeedback();
		if (state.script !== previous.script) render();
	});
	render();
}
