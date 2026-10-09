import type { FakeDoorFeature } from "./analytics/events";

/**
 * Flip to true once an email/newsletter provider exists and `subscribe` is wired to it.
 * While false, the fake-door dialog does not render the email field at all.
 */
export const EMAIL_CAPTURE_ENABLED = false;

export interface InterestSignup {
	email: string;
	feature: FakeDoorFeature;
}

/**
 * Stub: no provider yet. Resolves { ok: false } and sends nothing anywhere.
 *
 * To wire a provider later, do three things:
 *   1. Send `signup` to the provider from here. The site has no backend, so use the provider's
 *      hosted form endpoint or its client-side subscribe API. Do not add a server route for this.
 *   2. Resolve { ok: true } only when the provider accepted the address.
 *   3. Set EMAIL_CAPTURE_ENABLED to true.
 * The email address stays out of analytics. fake-doors.ts reports only `email_provided`.
 */
export async function subscribe(_signup: InterestSignup): Promise<{ ok: boolean }> {
	return { ok: false };
}
