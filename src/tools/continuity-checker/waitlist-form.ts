import { readAnswers } from "../../lib/forms/answers";
import { sendSignup, sendSurveyAnswers } from "../../lib/forms/client";
import { HONEYPOT_FIELD, parseSignup, parseSurveyAnswers } from "../../lib/forms/submission";
import { required } from "../../lib/dom";

const FORM_NAME = "continuity-checker";

export function mountWaitlistForm(): void {
	const signupForm = required<HTMLFormElement>(document, "[data-waitlist-signup]");
	const joined = required(document, "[data-waitlist-joined]");
	const surveyForm = required<HTMLFormElement>(document, "[data-waitlist-survey]");
	const thanks = required(document, "[data-waitlist-thanks]");

	let signupId = "";

	signupForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const fields = new FormData(signupForm);
		const signup = parseSignup({
			form: FORM_NAME,
			email: fields.get("email"),
			earlyAccess: fields.has("early_access"),
		});
		if (!signup) return showProblem({ form: signupForm, problem: "email" });

		const honeypot = String(fields.get(HONEYPOT_FIELD) ?? "");
		const id = await whileSending(signupForm, () => sendSignup({ signup, honeypot }));
		if (!id) return showProblem({ form: signupForm, problem: "save" });

		signupId = id;
		replaceSteps({ from: [signupForm], to: [joined, surveyForm] });
		required(joined, "[data-waitlist-joined-heading]").focus();
	});

	surveyForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const survey = parseSurveyAnswers({ signupId, answers: readAnswers(surveyForm) });
		if (!survey) return showProblem({ form: surveyForm, problem: "empty" });

		const saved = await whileSending(surveyForm, () => sendSurveyAnswers(survey));
		if (!saved) return showProblem({ form: surveyForm, problem: "save" });

		replaceSteps({ from: [joined, surveyForm], to: [thanks] });
		required(thanks, "[data-waitlist-thanks-heading]").focus();
	});
}

function showProblem(opts: { form: HTMLFormElement; problem: string | null }): void {
	for (const message of opts.form.querySelectorAll<HTMLElement>("[data-problem]")) {
		message.hidden = message.dataset.problem !== opts.problem;
	}
}

async function whileSending<T>(form: HTMLFormElement, send: () => Promise<T>): Promise<T> {
	const button = required<HTMLButtonElement>(form, 'button[type="submit"]');
	showProblem({ form, problem: null });
	button.disabled = true;
	form.setAttribute("aria-busy", "true");
	try {
		return await send();
	} finally {
		button.disabled = false;
		form.removeAttribute("aria-busy");
	}
}

function replaceSteps(opts: { from: HTMLElement[]; to: HTMLElement[] }): void {
	for (const step of opts.from) step.hidden = true;
	for (const step of opts.to) step.hidden = false;
}
