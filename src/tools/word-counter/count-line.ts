import { debounce } from "../../lib/debounce";
import { required } from "../../lib/dom";
import { speakingTime, summarize, type State, type Store, type Summary } from "./lib/state";

const ANNOUNCE_AFTER_MS = 1000;

export function mountCountLine(store: Store): void {
	const line = required(document, "#wc-count-line");
	const count = required(document, "#wc-count");
	const status = required(document, "#wc-status");
	const speaking = required(document, "#wc-speaking");
	const announcement = required(document, "#wc-announcement");

	let announced = spoken(summarize(store.get()));
	const announceWhenSettled = debounce((text: string) => {
		if (text === announced) return;
		announced = text;
		announcement.textContent = text;
	}, ANNOUNCE_AFTER_MS);

	function render(state: Readonly<State>) {
		const summary = summarize(state);
		count.textContent = summary.count;
		status.textContent = summary.evaluation?.status ?? "";
		const time = speakingTime(state);
		speaking.textContent = time ?? "";
		speaking.hidden = time === null;
		if (summary.evaluation) line.dataset.state = summary.evaluation.state;
		else delete line.dataset.state;
		announceWhenSettled(spoken(summary));
	}

	render(store.get());
	store.subscribe(render);
}

function spoken({ count, evaluation }: Summary): string {
	return evaluation ? `${count}, ${evaluation.status}` : count;
}
