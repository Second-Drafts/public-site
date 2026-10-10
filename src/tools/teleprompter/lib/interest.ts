import type { FakeDoorFeature } from "./analytics/events";

export const EMAIL_CAPTURE_ENABLED = false;

export interface InterestSignup {
	email: string;
	feature: FakeDoorFeature;
}

export async function subscribe(_signup: InterestSignup): Promise<{ ok: boolean }> {
	return { ok: false };
}
