import { formatAmount } from "../../../lib/text/readout";

const MINUS = "−";

/** "+412 this session" or "−86 this session (trimmed)". Only meaningful once something has changed. */
export function sessionProgressText(change: number): string {
	const amount = formatAmount(Math.abs(change), "words");
	return change > 0 ? `+${amount} this session` : `${MINUS}${amount} this session (trimmed)`;
}
