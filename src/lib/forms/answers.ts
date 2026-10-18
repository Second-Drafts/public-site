import type { Answers } from "./submission";

type AnswerInput = HTMLInputElement | HTMLTextAreaElement;

/**
 * What a survey form's named fields hold, leaving out questions nobody answered. Checkbox groups give a list,
 * and inputs marked `data-number` (ScaleField) give a number. Fields that aren't shown, like a ChoiceField's
 * "other" detail after its option is unpicked, are left out too.
 */
export function readAnswers(form: HTMLFormElement): Answers {
	const answers: Answers = {};
	for (const input of form.querySelectorAll<AnswerInput>("input[name], textarea[name]")) {
		if (input.disabled || !input.checkVisibility()) continue;

		if (input instanceof HTMLInputElement && input.type === "checkbox") {
			if (input.checked) answers[input.name] = [...asList(answers[input.name]), input.value];
			continue;
		}
		if (input instanceof HTMLInputElement && input.type === "radio") {
			if (input.checked) answers[input.name] = input.dataset.number === undefined ? input.value : Number(input.value);
			continue;
		}

		const text = input.value.trim();
		if (text !== "") answers[input.name] = text;
	}
	return answers;
}

function asList(answer: Answers[string] | undefined): string[] {
	return Array.isArray(answer) ? answer : [];
}
