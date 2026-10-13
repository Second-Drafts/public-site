import { limitOffset, wordSpans } from "../../../lib/text/measure";
import { activeTarget, summarize, type State } from "./state";
import type { Rule } from "./target";

const RULES_WITH_A_LIMIT: readonly Rule[] = ["at-most", "exactly"];
const WORDS_QUOTED = 4;
const QUOTE_WINDOW = 200;

/**
 * Where the text past the limit starts, or null when nothing has to go. Only when the status line says "over", so the
 * two never disagree: a seconds target rounds, and a few words past the spoken limit can still read "At the limit".
 */
export function cutOffset(state: State): number | null {
	const target = activeTarget(state);
	if (!target || !RULES_WITH_A_LIMIT.includes(target.rule)) return null;
	if (summarize(state).evaluation?.state !== "over") return null;
	return limitOffset(state.text, target.unit, target.value);
}

export function cutAnnouncement(text: string, offset: number): string {
	const quoted = wordsBefore(text, offset);
	return quoted ? `Your limit falls after “${quoted}”.` : "Your limit falls before the first word.";
}

function wordsBefore(text: string, offset: number): string {
	const windowStart = Math.max(0, offset - QUOTE_WINDOW);
	const before = text.slice(windowStart, offset);
	const spans = wordSpans(before);
	const dropped = spans.length > WORDS_QUOTED;
	const from = dropped ? spans[spans.length - WORDS_QUOTED].start : 0;
	const quoted = before.slice(from).replace(/\s+/gu, " ").trim();
	return quoted && (dropped || windowStart > 0) ? `…${quoted}` : quoted;
}
