/** Lowercase "#rrggbb" for a "#rgb" or "#rrggbb" colour (any case), or null for anything else. */
export function normalizeHex(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
	if (!match) return null;
	const hex = match[1].toLowerCase();
	return `#${hex.length === 3 ? hex.replace(/./g, "$&$&") : hex}`;
}
