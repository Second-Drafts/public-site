import { required } from "../../lib/dom";
import { settledAnnouncer } from "../../lib/live-region";
import type { TextHighlights } from "../../lib/text-highlights";
import { cutAnnouncement, cutOffset } from "./lib/cut-line";
import type { State, Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

export function mountCutLine(store: Store, highlights: TextHighlights, usage: UsageHooks): void {
	const announcement = required(document, "#wc-cut-announcement");

	const initial = store.get();
	const announceWhenSettled = settledAnnouncer(announcement, spoken(initial.text, cutOffset(initial)));

	function render(state: Readonly<State>) {
		const offset = cutOffset(state);
		highlights.paint("cut", offset === null ? [] : [{ start: offset, end: state.text.length }]);
		if (offset !== null) usage.onCutLineShown();
		announceWhenSettled(spoken(state.text, offset));
	}

	render(store.get());
	store.subscribe(render);
}

function spoken(text: string, offset: number | null): string {
	return offset === null ? "" : cutAnnouncement(text, offset);
}
