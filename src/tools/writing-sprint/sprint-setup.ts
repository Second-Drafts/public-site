import { required } from "../../lib/dom";
import type { Editor } from "./editor";
import { isValidSprintLength, sprintSummary, startSprint } from "./lib/sprint";
import type { State, Store } from "./lib/state";
import { countWords } from "../../lib/text/measure";

const CUSTOM_LENGTH = "custom";

export function mountSprintSetup(store: Store, editor: Editor): void {
	const setup = required(document, "#ws-setup");
	const summary = required(document, "#ws-summary");
	const customField = required(document, "#ws-custom");
	const customMinutes = required<HTMLInputElement>(document, "#ws-custom-minutes");
	const choices = Array.from(setup.querySelectorAll<HTMLInputElement>('input[name="ws-length"]'));

	function chosenLength(): string {
		return choices.find((choice) => choice.checked)?.value ?? CUSTOM_LENGTH;
	}

	function chosenMinutes(): number {
		const length = chosenLength();
		return length === CUSTOM_LENGTH ? customMinutes.valueAsNumber : Number(length);
	}

	for (const choice of choices) {
		choice.addEventListener("change", () => {
			customField.hidden = chosenLength() !== CUSTOM_LENGTH;
			if (!customField.hidden) customMinutes.focus();
		});
	}

	required(document, "#ws-start").addEventListener("click", () => {
		const minutes = chosenMinutes();
		if (!isValidSprintLength(minutes)) return customMinutes.focus();
		store.set({ sprint: startSprint(minutes, Date.now(), countWords(store.get().text)), finished: null });
		editor.focusAtEnd();
	});

	function render({ sprint, finished }: Readonly<State>) {
		setup.hidden = sprint !== null;
		summary.textContent = finished ? sprintSummary(finished) : "";
	}

	render(store.get());
	store.subscribe(render);
}
