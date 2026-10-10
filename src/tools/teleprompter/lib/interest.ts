import type { FakeDoorFeature } from "./analytics/events";

/** While false, the fake-door dialog does not render the email field at all. */
export const EMAIL_CAPTURE_ENABLED = false;

export interface InterestSignup {
	email: string;
	feature: FakeDoorFeature;
}

/** Stub: no provider yet, sends nothing anywhere. The address must stay out of analytics. */
export async function subscribe(_signup: InterestSignup): Promise<{ ok: boolean }> {
	return { ok: false };
}
