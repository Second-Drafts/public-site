import lock from "./registry.lock.json";

export const policyUpdatedDate = (): Date => new Date(`${lock.updated}T00:00:00Z`);

export function policyLastUpdated(): string {
	return policyUpdatedDate().toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}
