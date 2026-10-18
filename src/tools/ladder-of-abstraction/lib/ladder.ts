/** "up" asks so what? and lands on a broader rung; "down" asks like what? and lands on a more concrete one. */
export type Direction = "up" | "down";

export interface Rung {
	id: string;
	text: string;
	/** How the writer reached this rung, which decides the question its empty field asks. */
	reachedBy: Direction | "start";
	leftOutOfPassage: boolean;
}

/** Ordered from the most abstract rung at the top to the most concrete at the bottom. */
export type Ladder = readonly Rung[];

export type PassageOrder = "detail-first" | "idea-first";

export const PASSAGE_ORDERS: readonly PassageOrder[] = ["detail-first", "idea-first"];

export const MAX_RUNGS = 12;

export function startingRung(id: string): Rung {
	return { id, text: "", reachedBy: "start", leftOutOfPassage: false };
}

export function canClimb(ladder: Ladder): boolean {
	return ladder.length < MAX_RUNGS;
}

export function addRung(ladder: Ladder, fromId: string, direction: Direction, newId: string): Ladder {
	const from = ladder.findIndex((rung) => rung.id === fromId);
	if (from === -1 || !canClimb(ladder)) return ladder;
	const at = direction === "up" ? from : from + 1;
	const rung: Rung = { id: newId, text: "", reachedBy: direction, leftOutOfPassage: false };
	return [...ladder.slice(0, at), rung, ...ladder.slice(at)];
}

export function editRung(ladder: Ladder, id: string, text: string): Ladder {
	return ladder.map((rung) => (rung.id === id ? { ...rung, text } : rung));
}

/** Removing the only rung empties it instead, so a ladder always has somewhere to start. */
export function removeRung(ladder: Ladder, id: string): Ladder {
	const remaining = ladder.filter((rung) => rung.id !== id);
	if (remaining.length > 0) return remaining;
	return ladder.map((rung) => startingRung(rung.id));
}

export function toggleInPassage(ladder: Ladder, id: string): Ladder {
	return ladder.map((rung) => (rung.id === id ? { ...rung, leftOutOfPassage: !rung.leftOutOfPassage } : rung));
}

export function writtenRungs(ladder: Ladder): Rung[] {
	return ladder.filter((rung) => rung.text.trim() !== "");
}

export function isBlank(ladder: Ladder): boolean {
	return writtenRungs(ladder).length === 0;
}

/** The written rungs in reading order: the bottom of the ladder first for detail-first, the top first for idea-first. */
export function passageRungs(ladder: Ladder, order: PassageOrder): Rung[] {
	const topFirst = writtenRungs(ladder);
	return order === "idea-first" ? topFirst : topFirst.reverse();
}

export function passageText(ladder: Ladder, order: PassageOrder): string {
	return passageRungs(ladder, order)
		.filter((rung) => !rung.leftOutOfPassage)
		.map((rung) => rung.text.trim())
		.join(" ");
}

export function ladderText(ladder: Ladder): string {
	return writtenRungs(ladder)
		.map((rung) => rung.text.trim())
		.join("\n");
}
