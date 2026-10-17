import { required } from "../../lib/dom";
import type { Reading, State, Store } from "./lib/state";

const UNASKED = "A question kept to yourself";

export function mountAnswerLog(store: Store): void {
	const section = required(document, "#m8-log-section");
	const list = required(section, "#m8-log");
	const emptyNotice = required(section, "#m8-log-empty");

	function entry({ question, answer }: Reading): HTMLLIElement {
		const item = document.createElement("li");
		const asked = document.createElement("p");
		asked.className = "m8-log__question";
		asked.classList.toggle("is-unasked", !question);
		asked.textContent = question || UNASKED;
		const answered = document.createElement("p");
		answered.className = "m8-log__answer";
		answered.dataset.tone = answer.tone;
		answered.textContent = answer.text;
		item.append(asked, answered);
		return item;
	}

	function render({ log }: Readonly<State>, previous?: Readonly<State>) {
		if (log === previous?.log) return;
		emptyNotice.hidden = log.length > 0;
		list.replaceChildren(...log.map(entry));
	}

	render(store.get());
	store.subscribe(render);
}
