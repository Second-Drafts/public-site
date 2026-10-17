// Sends a form's submissions to the forms Worker. Callers validate with ./submission first.
import { asRecord } from "../validate";
import { HONEYPOT_FIELD, type Signup, type SurveyAnswers } from "./submission";

const FORMS_URL = import.meta.env.PUBLIC_FORMS_URL;

/** Saves a signup and returns the id its survey answers are filed under, or null when it couldn't be saved. */
export async function sendSignup(opts: { signup: Signup; honeypot: string }): Promise<string | null> {
	const response = await post("/signups", { ...opts.signup, [HONEYPOT_FIELD]: opts.honeypot });
	if (!response?.ok) return null;

	const { id } = asRecord(await response.json().catch(() => null));
	return typeof id === "string" ? id : null;
}

export async function sendSurveyAnswers(survey: SurveyAnswers): Promise<boolean> {
	const response = await post("/answers", survey);
	return response?.ok ?? false;
}

async function post(path: string, body: unknown): Promise<Response | null> {
	try {
		return await fetch(new URL(path, FORMS_URL), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
	} catch {
		return null;
	}
}
