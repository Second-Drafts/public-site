import type { Unit } from "../../../lib/text/measure";

const numberFormat = new Intl.NumberFormat("en");

const UNIT_LABELS: Record<Unit, { one: string; other: string }> = {
	words: { one: "word", other: "words" },
	characters: { one: "character", other: "characters" },
	seconds: { one: "aloud", other: "aloud" },
};

/** "1,240 words", or with a target "1,240 / 1,000 words". The label agrees with the last number shown. */
export function countText(amount: number, unit: Unit, targetValue?: number): string {
	const last = targetValue ?? amount;
	const label = last === 1 ? UNIT_LABELS[unit].one : UNIT_LABELS[unit].other;
	const shown =
		targetValue === undefined
			? formatAmount(amount, unit)
			: `${formatAmount(amount, unit)} / ${formatAmount(targetValue, unit)}`;
	return `${shown} ${label}`;
}

export function formatAmount(amount: number, unit: Unit): string {
	return unit === "seconds" ? formatDuration(amount) : numberFormat.format(amount);
}

export function formatDuration(seconds: number): string {
	const total = Math.round(seconds);
	const minutes = Math.floor(total / 60);
	const rest = total % 60;
	if (minutes === 0) return `${rest} sec`;
	return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} sec`;
}
