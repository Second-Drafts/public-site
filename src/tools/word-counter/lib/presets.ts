import type { Target } from "./target";

export const NO_PRESET = "none";
export const CUSTOM_PRESET = "custom";

export interface Preset {
	id: string;
	name: string;
	group: string;
	description: string;
	target: Target;
}

export const PRESETS: readonly Preset[] = [
	{
		id: "six-word-story",
		name: "Six-word story",
		group: "Fiction",
		description: "A story of exactly 6 words",
		target: { unit: "words", rule: "exactly", value: 6 },
	},
	{
		id: "drabble",
		name: "Drabble",
		group: "Fiction",
		description: "A story of exactly 100 words",
		target: { unit: "words", rule: "exactly", value: 100 },
	},
	{
		id: "microfiction",
		name: "Microfiction",
		group: "Fiction",
		description: "A story of up to 300 words",
		target: { unit: "words", rule: "at-most", value: 300 },
	},
	{
		id: "flash-fiction",
		name: "Flash fiction",
		group: "Fiction",
		description: "A story of up to 1,000 words",
		target: { unit: "words", rule: "at-most", value: 1000 },
	},
	{
		id: "short-story",
		name: "Short story",
		group: "Fiction",
		description: "A story of up to 7,500 words",
		target: { unit: "words", rule: "at-most", value: 7500 },
	},
	{
		id: "query-letter",
		name: "Query letter",
		group: "Submissions",
		description: "A letter to an agent of about 300 words",
		target: { unit: "words", rule: "around", value: 300 },
	},
	{
		id: "one-page-synopsis",
		name: "One-page synopsis",
		group: "Submissions",
		description: "A synopsis of up to 500 words, about a single-spaced page",
		target: { unit: "words", rule: "at-most", value: 500 },
	},
	{
		id: "logline",
		name: "Logline",
		group: "Submissions",
		description: "A one- or two-sentence pitch of up to 50 words",
		target: { unit: "words", rule: "at-most", value: 50 },
	},
	{
		id: "common-app-essay",
		name: "Common App personal essay",
		group: "Essays",
		description: "An essay of 250 to 650 words",
		target: { unit: "words", rule: "at-most", value: 650, min: 250 },
	},
	{
		id: "x-post",
		name: "X post",
		group: "Social",
		description: "A post of up to 280 characters. X counts every link as 23 and some scripts as 2 each",
		target: { unit: "characters", rule: "at-most", value: 280 },
	},
	{
		id: "bluesky-post",
		name: "Bluesky post",
		group: "Social",
		description: "A post of up to 300 characters",
		target: { unit: "characters", rule: "at-most", value: 300 },
	},
	{
		id: "threads-post",
		name: "Threads post",
		group: "Social",
		description: "A post of up to 500 characters",
		target: { unit: "characters", rule: "at-most", value: 500 },
	},
	{
		id: "thirty-second-read",
		name: "30-second read",
		group: "Spoken",
		description: "A script that takes about 30 seconds to read aloud",
		target: { unit: "seconds", rule: "around", value: 30 },
	},
	{
		id: "sixty-second-read",
		name: "60-second read",
		group: "Spoken",
		description: "A script that takes about a minute to read aloud",
		target: { unit: "seconds", rule: "around", value: 60 },
	},
	{
		id: "five-minute-talk",
		name: "Five-minute talk",
		group: "Spoken",
		description: "A talk that takes about 5 minutes to give",
		target: { unit: "seconds", rule: "around", value: 300 },
	},
];

export function findPreset(id: string): Preset | undefined {
	return PRESETS.find((preset) => preset.id === id);
}

export function presetGroups(): { name: string; presets: Preset[] }[] {
	const groups = new Map<string, Preset[]>();
	for (const preset of PRESETS) groups.set(preset.group, [...(groups.get(preset.group) ?? []), preset]);
	return [...groups].map(([name, presets]) => ({ name, presets }));
}
