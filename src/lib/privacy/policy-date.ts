import lock from "./registry.lock.json";

export function policyLastUpdated(): string {
	return new Date(`${lock.updated}T00:00:00Z`).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
}
