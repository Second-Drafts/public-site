import { required } from "../../lib/dom";
import { countWords } from "../../lib/text/measure";
import type { Editor } from "./editor";
import {
	fractionElapsed,
	formatClock,
	isPaused,
	pauseSprint,
	resumeSprint,
	sprintWords,
	timeLeftMs,
	type Sprint,
} from "./lib/sprint";
import type { State, Store } from "./lib/state";

const TICK_MS = 250;

export function mountSprintBar(store: Store, editor: Editor): void {
	const bar = required(document, "#ws-bar");
	const clockGroup = required(document, "#ws-clock-group");
	const clock = required(document, "#ws-clock");
	const track = required(document, "#ws-track");
	const progress = required(document, "#ws-progress");
	const pause = required<HTMLButtonElement>(document, "#ws-pause");
	const hideTimer = required<HTMLButtonElement>(document, "#ws-hide-timer");
	const eye = required(document, "#ws-eye");
	const eyeOff = required(document, "#ws-eye-off");

	let words = countWords(store.get().text);
	let ticker: ReturnType<typeof setInterval> | undefined;

	function finish(sprint: Sprint) {
		store.set({ sprint: null, finished: { minutes: sprint.minutes, words: sprintWords(sprint, words) } }, "system");
	}

	function renderTimer(sprint: Sprint, timerHidden: boolean) {
		const now = Date.now();
		const timeLeft = timeLeftMs(sprint, now);
		clock.textContent = formatClock(timeLeft);
		progress.style.setProperty("--elapsed", String(fractionElapsed(sprint, now)));
		clockGroup.hidden = track.hidden = timerHidden;
		if (timeLeft === 0) finish(sprint);
	}

	function render({ sprint, timerHidden }: Readonly<State>) {
		bar.hidden = sprint === null;
		if (!sprint) {
			clearInterval(ticker);
			ticker = undefined;
			return;
		}
		ticker ??= setInterval(tick, TICK_MS);
		setLabel(pause, isPaused(sprint) ? "Resume" : "Pause");
		setLabel(hideTimer, timerHidden ? "Show timer" : "Hide timer");
		eye.hidden = timerHidden;
		eyeOff.hidden = !timerHidden;
		renderTimer(sprint, timerHidden);
	}

	function tick() {
		render(store.get());
	}

	pause.addEventListener("click", () => {
		const { sprint } = store.get();
		if (!sprint) return;
		const now = Date.now();
		store.set({ sprint: isPaused(sprint) ? resumeSprint(sprint, now) : pauseSprint(sprint, now) });
	});
	required(document, "#ws-stop").addEventListener("click", () => {
		store.set({ sprint: null, finished: null });
		editor.focusAtEnd();
	});
	hideTimer.addEventListener("click", () => store.set({ timerHidden: !store.get().timerHidden }));
	document.addEventListener("visibilitychange", tick);

	store.subscribe((state, previous) => {
		if (state.text !== previous.text) words = countWords(state.text);
		render(state);
	});
	render(store.get());
}

function setLabel(button: HTMLElement, label: string) {
	required(button, ".sd-btn__label").textContent = label;
}
