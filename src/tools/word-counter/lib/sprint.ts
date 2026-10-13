import { formatAmount } from "./readout";

export const SPRINT_PRESET_MINUTES = [10, 15, 25] as const;
export const MAX_SPRINT_MINUTES = 180;

const MS_PER_MINUTE = 60_000;

export interface Sprint {
	minutes: number;
	startedAt: number;
	wordsAtStart: number;
}

export function isValidSprintLength(minutes: number): boolean {
	return Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_SPRINT_MINUTES;
}

export function startSprint(minutes: number, now: number, wordsAtStart: number): Sprint {
	return { minutes, startedAt: now, wordsAtStart };
}

/** Computed from timestamps, so a throttled or suspended tab is still right when it wakes. */
export function timeLeftMs(sprint: Sprint, now: number): number {
	return Math.max(0, sprint.minutes * MS_PER_MINUTE - (now - sprint.startedAt));
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

export function wordsText(words: number): string {
	return `${formatAmount(words, "words")} ${words === 1 ? "word" : "words"}`;
}

export function sprintSummary(minutes: number, words: number): string {
	return `${minutes} ${minutes === 1 ? "minute" : "minutes"} \u00b7 ${wordsText(words)}`;
}
