export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function pickEnum<T extends string>(allowed: readonly T[], value: unknown, fallback: T): T {
	return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function pickBool(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

/** The value's fields, or none when it isn't a plain object, so validation can read any field without checking first. */
export function asRecord(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}
