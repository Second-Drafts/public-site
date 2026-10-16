// The shape of what our forms send to the forms Worker. The Worker and the forms both validate with these.
import { asRecord } from "../validate";

export type Answer = string | number | string[];
export type Answers = Record<string, Answer>;

export interface Signup {
	form: string;
	email: string;
	earlyAccess: boolean;
}

export interface SurveyAnswers {
	signupId: string;
	answers: Answers;
}

// Hidden from people, so only bots fill it in.
export const HONEYPOT_FIELD = "website";

// A form name, optionally followed by the feature it's about: "continuity-checker", "teleprompter:voice_scroll".
const FORM_PATTERN = /^[a-z0-9-]{1,40}(:[a-z0-9_-]{1,40})?$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const QUESTION_PATTERN = /^[a-z0-9_]{1,40}$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_TEXT_LENGTH = 2000;
const MAX_QUESTIONS = 20;
const MAX_CHOICES = 20;

export function isFromBot(body: unknown): boolean {
	return Boolean(asRecord(body)[HONEYPOT_FIELD]);
}

export function parseSignup(body: unknown): Signup | null {
	const { form, email, earlyAccess } = asRecord(body);
	if (typeof form !== "string" || !FORM_PATTERN.test(form)) return null;
	if (typeof email !== "string") return null;

	const normalisedEmail = email.trim().toLowerCase();
	if (normalisedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalisedEmail)) return null;

	return { form, email: normalisedEmail, earlyAccess: earlyAccess === true };
}

export function parseSurveyAnswers(body: unknown): SurveyAnswers | null {
	const { signupId, answers } = asRecord(body);
	if (typeof signupId !== "string" || !UUID_PATTERN.test(signupId)) return null;

	const entries = Object.entries(asRecord(answers));
	if (entries.length === 0 || entries.length > MAX_QUESTIONS) return null;

	const parsed: Answers = {};
	for (const [question, answer] of entries) {
		if (!QUESTION_PATTERN.test(question) || !isAnswer(answer)) return null;
		parsed[question] = answer;
	}
	return { signupId, answers: parsed };
}

function isText(value: unknown): value is string {
	return typeof value === "string" && value.length <= MAX_TEXT_LENGTH;
}

function isAnswer(value: unknown): value is Answer {
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.length <= MAX_CHOICES && value.every(isText);
	return isText(value);
}
