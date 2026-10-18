import type { Ladder, Rung } from "./ladder";

const EXAMPLE_LINES = [
	"We hold on to whatever proves we were loved.",
	"Grief makes ordinary objects hard to give away.",
	"She kept a few things from her mother's kitchen.",
	"Every morning she drinks from her mother's chipped blue mug.",
	"A hairline crack runs from the rim to the handle, stained brown by forty years of coffee.",
];

const STARTED_FROM = EXAMPLE_LINES.indexOf("Every morning she drinks from her mother's chipped blue mug.");

function reachedBy(index: number): Rung["reachedBy"] {
	if (index === STARTED_FROM) return "start";
	return index < STARTED_FROM ? "up" : "down";
}

export const EXAMPLE_LADDER: Ladder = EXAMPLE_LINES.map((text, index) => ({
	id: `example-${index + 1}`,
	text,
	reachedBy: reachedBy(index),
	leftOutOfPassage: false,
}));
