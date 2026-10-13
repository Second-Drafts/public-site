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
	const pauseLabel = required(pause, ".sd-btn__label");
	const hideTimerLabel = required(hideTimer, ".sd-btn__label");

	let ticker: ReturnType<typeof setInterval> | undefined;

	function finish(sprint: Sprint) {
		const words = sprintWords(sprint, countWords(store.get().text));
		store.set({ sprint: null, finished: { minutes: sprint.minutes, words } }, "system");
	}

	function renderTimer(sprint: Sprint) {
		const now = Date.now();
		clock.textContent = formatClock(timeLeftMs(sprint, now));
		progress.style.setProperty("--elapsed", String(fractionElapsed(sprint, now)));
	}

	function keepTicking(running: boolean) {
		if (running) ticker ??= setInterval(tick, TICK_MS);
		else {
			clearInterval(ticker);
			ticker = undefined;
		}
	}

	function render({ sprint, timerHidden }: Readonly<State>) {
		bar.hidden = sprint === null;
		keepTicking(sprint !== null && !isPaused(sprint));
		if (!sprint) return;
		pauseLabel.textContent = isPaused(sprint) ? "Resume" : "Pause";
		hideTimerLabel.textContent = timerHidden ? "Show timer" : "Hide timer";
		eye.hidden = timerHidden;
		eyeOff.hidden = !timerHidden;
		clockGroup.hidden = track.hidden = timerHidden;
		renderTimer(sprint);
	}

	function tick() {
		const { sprint } = store.get();
		if (!sprint) return;
		if (timeLeftMs(sprint, Date.now()) === 0) return finish(sprint);
		renderTimer(sprint);
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
		if (state.sprint !== previous.sprint || state.timerHidden !== previous.timerHidden) render(state);
	});
	render(store.get());
}
