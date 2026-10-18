import { isFromBot, parseSignup, parseSurveyAnswers } from "../../src/lib/forms/submission";

interface Env {
	DB: D1Database;
	RATE_LIMITER: RateLimit;
	ALLOWED_ORIGIN: string;
}

interface Reply {
	status: number;
	body?: Record<string, string>;
}

const MAX_BODY_BYTES = 32_000;

export default {
	async fetch(request, env): Promise<Response> {
		const cors = {
			"Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
			"Access-Control-Allow-Methods": "POST",
			"Access-Control-Allow-Headers": "Content-Type",
			Vary: "Origin",
		};
		if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

		const reply = await handle(request, env);
		const body = reply.body ? JSON.stringify(reply.body) : null;
		return new Response(body, { status: reply.status, headers: { ...cors, "Content-Type": "application/json" } });
	},
} satisfies ExportedHandler<Env>;

async function handle(request: Request, env: Env): Promise<Reply> {
	if (request.method !== "POST") return { status: 405 };
	if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) return { status: 403 };
	if (Number(request.headers.get("Content-Length") ?? MAX_BODY_BYTES + 1) > MAX_BODY_BYTES) return { status: 413 };

	// The IP address is only the rate limiter's key; it is never stored.
	const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
	const { success } = await env.RATE_LIMITER.limit({ key: ip });
	if (!success) return { status: 429 };

	const body: unknown = await request.json().catch(() => null);
	const { pathname } = new URL(request.url);
	if (pathname === "/signups") return createSignup(env.DB, body);
	if (pathname === "/answers") return saveSurveyAnswers(env.DB, body);
	return { status: 404 };
}

async function createSignup(db: D1Database, body: unknown): Promise<Reply> {
	if (isFromBot(body)) return { status: 201, body: { id: crypto.randomUUID() } };

	const signup = parseSignup(body);
	if (!signup) return { status: 400 };

	const id = crypto.randomUUID();
	await db
		.prepare("INSERT INTO submissions (id, form, email, early_access) VALUES (?, ?, ?, ?)")
		.bind(id, signup.form, signup.email, signup.earlyAccess ? 1 : 0)
		.run();
	return { status: 201, body: { id } };
}

async function saveSurveyAnswers(db: D1Database, body: unknown): Promise<Reply> {
	const survey = parseSurveyAnswers(body);
	if (!survey) return { status: 400 };

	const { meta } = await db
		.prepare("UPDATE submissions SET answers = ? WHERE id = ? AND answers IS NULL")
		.bind(JSON.stringify(survey.answers), survey.signupId)
		.run();
	return { status: meta.changes === 1 ? 204 : 409 };
}
