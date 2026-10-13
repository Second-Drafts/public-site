import { required } from "../../lib/dom";
import type { Deck } from "./lib/answers";
import { shakeStarted } from "./lib/oracle";
import type { Store } from "./lib/state";

export function mountQuestionForm(store: Store): void {
	const form = required<HTMLFormElement>(document, "#m8-form");
	const question = required<HTMLInputElement>(form, "#m8-question");

	question.addEventListener("input", () => store.set({ question: question.value }));

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		store.set(shakeStarted(store.get(), "submit"));
	});

	for (const choice of document.querySelectorAll<HTMLInputElement>('input[name="m8-deck"]')) {
		choice.addEventListener("change", () => store.set({ deck: choice.value as Deck }));
	}
}
