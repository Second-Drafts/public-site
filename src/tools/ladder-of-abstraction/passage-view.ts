import { required } from "../../lib/dom";
import { passageRungs, toggleInPassage, type PassageOrder } from "./lib/ladder";
import type { State, Store } from "./lib/state";

const MIN_RUNGS_FOR_A_PASSAGE = 2;

/** A span rather than a <button>, so a long line wraps like the rest of the paragraph. */
function lineButton(id: string, text: string, included: boolean): HTMLSpanElement {
	const button = document.createElement("span");
	button.setAttribute("role", "button");
	button.tabIndex = 0;
	button.className = "la-line";
	button.dataset.rungId = id;
	button.textContent = text.trim();
	button.setAttribute("aria-pressed", String(included));
	return button;
}

export function mountPassageView(store: Store): void {
	const text = required(document, "#la-passage-text");
	const empty = required(document, "#la-passage-empty");
	const orderInputs = [...document.querySelectorAll<HTMLInputElement>('input[name="la-order"]')];

	function render({ ladder, passageOrder }: State) {
		const rungs = passageRungs(ladder, passageOrder);
		const readable = rungs.length >= MIN_RUNGS_FOR_A_PASSAGE;
		empty.hidden = readable;
		text.hidden = !readable;
		const restoreFocusTo = text.contains(document.activeElement)
			? (document.activeElement as HTMLElement).dataset.rungId
			: undefined;
		text.replaceChildren(
			...rungs.flatMap((rung, index) => {
				const line = lineButton(rung.id, rung.text, !rung.leftOutOfPassage);
				return index === 0 ? [line] : [document.createTextNode(" "), line];
			}),
		);
		if (restoreFocusTo) text.querySelector<HTMLElement>(`[data-rung-id="${restoreFocusTo}"]`)?.focus();
		for (const input of orderInputs) input.checked = input.value === passageOrder;
	}

	function toggleLine(event: Event) {
		const rungId = (event.target as Element).closest<HTMLElement>(".la-line")?.dataset.rungId;
		if (rungId) store.set({ ladder: toggleInPassage(store.get().ladder, rungId) });
	}

	text.addEventListener("click", toggleLine);
	text.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		toggleLine(event);
	});

	for (const input of orderInputs) {
		input.addEventListener("change", () => {
			if (input.checked) store.set({ passageOrder: input.value as PassageOrder });
		});
	}

	render(store.get());
	store.subscribe(render);
}
