import { countText } from "../../../lib/text/readout";

export const SPRINT_PRESET_MINUTES = [10, 15, 25] as const;
export const MAX_SPRINT_MINUTES = 180;

const MS_PER_MINUTE = 60_000;

export interface Sprint {
	minutes: number;
	wordsAtStart: number;
	elapsedBeforePauseMs: number;
	/** When the running stretch began, or null while paused. */
	resumedAt: number | null;
}

export interface FinishedSprint {
	minutes: number;
	words: number;
}

export function isValidSprintLength(minutes: number): boolean {
	return Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_SPRINT_MINUTES;
}

export function startSprint(minutes: number, now: number, wordsAtStart: number): Sprint {
	return { minutes, wordsAtStart, elapsedBeforePauseMs: 0, resumedAt: now };
}

export function isPaused(sprint: Sprint): boolean {
	return sprint.resumedAt === null;
}

export function pauseSprint(sprint: Sprint, now: number): Sprint {
	return isPaused(sprint) ? sprint : { ...sprint, elapsedBeforePauseMs: elapsedMs(sprint, now), resumedAt: null };
}

export function resumeSprint(sprint: Sprint, now: number): Sprint {
	return isPaused(sprint) ? { ...sprint, resumedAt: now } : sprint;
}

/** Running time only, computed from timestamps, so a throttled or suspended tab is still right when it wakes. */
function elapsedMs(sprint: Sprint, now: number): number {
	return sprint.resumedAt === null
		? sprint.elapsedBeforePauseMs
		: sprint.elapsedBeforePauseMs + (now - sprint.resumedAt);
}

export function timeLeftMs(sprint: Sprint, now: number): number {
	return Math.max(0, sprint.minutes * MS_PER_MINUTE - elapsedMs(sprint, now));
}

export function fractionElapsed(sprint: Sprint, now: number): number {
	return 1 - timeLeftMs(sprint, now) / (sprint.minutes * MS_PER_MINUTE);
}

/** Net words added since the sprint began, never below zero: words already on the page don't count, and cutting doesn't go negative. */
export function sprintWords(sprint: Sprint, currentWords: number): number {
	return Math.max(0, currentWords - sprint.wordsAtStart);
}

export function formatClock(ms: number): string {
	const totalSeconds = Math.ceil(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = String(totalSeconds % 60).padStart(2, "0");
	return `${minutes}:${seconds}`;
}

export function sprintSummary({ minutes, words }: FinishedSprint): string {
	return `${minutes} ${minutes === 1 ? "minute" : "minutes"} · ${countText(words, "words")}`;
}
