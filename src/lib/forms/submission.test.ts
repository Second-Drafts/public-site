import { describe, expect, it } from "vitest";
import { HONEYPOT_FIELD, isFromBot, parseSignup, parseSurveyAnswers } from "./submission";

const SIGNUP_ID = "0b6f3c2e-8f1a-4c3d-9e2b-7a1d5c4f6e8b";

describe("parseSignup", () => {
	it("accepts a form, an email and early access", () => {
		expect(parseSignup({ form: "continuity-checker", email: "writer@example.com", earlyAccess: true })).toEqual({
			form: "continuity-checker",
			email: "writer@example.com",
			earlyAccess: true,
		});
	});

	it("accepts a feature after the form name", () => {
		expect(parseSignup({ form: "teleprompter:voice_scroll", email: "writer@example.com" })?.form).toBe(
			"teleprompter:voice_scroll",
		);
	});

	it("trims and lowercases the email", () => {
		expect(parseSignup({ form: "continuity-checker", email: "  Writer@Example.COM " })?.email).toBe(
			"writer@example.com",
		);
	});

	it("only grants early access when it is exactly true", () => {
		expect(
			parseSignup({ form: "continuity-checker", email: "writer@example.com", earlyAccess: "yes" })?.earlyAccess,
		).toBe(false);
	});

	it.each([
		["a missing email", { form: "continuity-checker" }],
		["an invalid email", { form: "continuity-checker", email: "writer" }],
		["an unknown form shape", { form: "Continuity Checker", email: "writer@example.com" }],
		["a body that isn't an object", "writer@example.com"],
	])("rejects %s", (_, body) => {
		expect(parseSignup(body)).toBeNull();
	});
});

describe("parseSurveyAnswers", () => {
	it("accepts text, numbers and lists of choices", () => {
		const answers = { project: "novel", reassurance: 4, catches: ["memory", "beta readers"] };
		expect(parseSurveyAnswers({ signupId: SIGNUP_ID, answers })).toEqual({ signupId: SIGNUP_ID, answers });
	});

	it.each([
		["a missing signup id", { answers: { project: "novel" } }],
		["no answers", { signupId: SIGNUP_ID, answers: {} }],
		["an answer that is too long", { signupId: SIGNUP_ID, answers: { slip: "x".repeat(2001) } }],
		["an answer of the wrong type", { signupId: SIGNUP_ID, answers: { project: { nested: true } } }],
		["a question name with spaces", { signupId: SIGNUP_ID, answers: { "a question": "novel" } }],
	])("rejects %s", (_, body) => {
		expect(parseSurveyAnswers(body)).toBeNull();
	});
});

describe("isFromBot", () => {
	it("is true only when the honeypot field is filled in", () => {
		expect(isFromBot({ [HONEYPOT_FIELD]: "https://spam.example" })).toBe(true);
		expect(isFromBot({ [HONEYPOT_FIELD]: "" })).toBe(false);
		expect(isFromBot({})).toBe(false);
	});
});
