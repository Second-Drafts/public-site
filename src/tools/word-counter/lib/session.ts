import { formatAmount } from "./readout";

const MINUS = "−";

/** Net words added since the baseline; negative when the draft has been cut down. */
export function sessionChange(baselineWords: number, currentWords: number): number {
	return currentWords - baselineWords;
}

export function sessionProgressText(change: number): string {
	if (change === 0) return "No change this session";
	const amount = formatAmount(Math.abs(change), "words");
	return change > 0 ? `+${amount} this session` : `${MINUS}${amount} this session (trimmed)`;
}
