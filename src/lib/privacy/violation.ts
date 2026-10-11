export function reportViolation(message: string): void {
	if (import.meta.env.DEV) throw new Error(`[privacy] ${message}`);
}
