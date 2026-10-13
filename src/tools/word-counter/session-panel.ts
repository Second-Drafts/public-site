import { required } from "../../lib/dom";
import { countWords } from "../../lib/text/measure";
import { sessionChange, sessionProgressText } from "./lib/session";
import type { State, Store } from "./lib/state";
import {
	fractionElapsed,
	formatClock,
	isValidSprintLength,
	sprintSummary,
	sprintWords,
	startSprint,
	timeLeftMs,
	wordsText,
	type Sprint,
} from "./lib/sprint";
import type { UsageHooks } from "./usage-tracking";

const TICK_MS = 250;

export function mountSessionPanel(store: Store, usage: UsageHooks): void {
	const progress = required(document, "#wc-session-progress");
	const setup = required(document, "#wc-sprint-setup");
	const running = required(document, "#wc-sprint-running");
	const clock = required(document, "#wc-sprint-clock");
	const wordsWritten = required(document, "#wc-sprint-words");
	const bar = required(document, "#wc-sprint-bar");
	const summary = required(document, "#wc-sprint-summary");
	const custom = required<HTMLInputElement>(document, "#wc-sprint-custom");

	let words = countWords(store.get().text);
	const baselineWords = words;
	let sprint: Sprint | null = null;
	let ticker: ReturnType<typeof setInterval> | undefined;

	function renderProgress() {
		progress.textContent = sessionProgressText(sessionChange(baselineWords, words));
	}

	function renderSprint() {
		if (!sprint) return;
		const now = Date.now();
		const timeLeft = timeLeftMs(sprint, now);
		clock.textContent = formatClock(timeLeft);
		wordsWritten.textContent = wordsText(sprintWords(sprint, words));
		bar.style.setProperty("--elapsed", String(fractionElapsed(sprint, now)));
		if (timeLeft === 0) finish(sprint);
	}

	function showRunning(isRunning: boolean) {
		running.hidden = !isRunning;
		setup.hidden = isRunning;
	}

	function begin(minutes: number) {
		sprint = startSprint(minutes, Date.now(), words);
		summary.textContent = "";
		showRunning(true);
		renderSprint();
		ticker = setInterval(renderSprint, TICK_MS);
		usage.onSprintStarted(minutes);
	}

	function end() {
		clearInterval(ticker);
		sprint = null;
		showRunning(false);
	}

	function finish(finished: Sprint) {
		summary.textContent = sprintSummary(finished.minutes, sprintWords(finished, words));
		end();
		usage.onSprintFinished(finished.minutes);
	}

	function stop() {
		end();
		summary.textContent = "";
	}

	setup.addEventListener("click", (event) => {
		const choice = (event.target as Element).closest<HTMLElement>("[data-sprint-minutes]");
		if (choice) begin(Number(choice.dataset.sprintMinutes));
	});
	required(document, "#wc-sprint-custom-start").addEventListener("click", () => {
		const minutes = custom.valueAsNumber;
		if (!isValidSprintLength(minutes)) return custom.focus();
		begin(minutes);
	});
	required(document, "#wc-sprint-stop").addEventListener("click", stop);
	document.addEventListener("visibilitychange", renderSprint);

	renderProgress();
	store.subscribe((state: Readonly<State>, previous: Readonly<State>) => {
		if (state.text === previous.text) return;
		words = countWords(state.text);
		renderProgress();
		renderSprint();
	});
}
