export function remainingSeconds(remainingPx: number, pxPerSecond: number): number {
	if (pxPerSecond <= 0) return Infinity;
	if (remainingPx <= 0) return 0;
	return remainingPx / pxPerSecond;
}

export function formatClock(seconds: number): string {
	if (!Number.isFinite(seconds)) return "–:––";
	const total = Math.max(0, Math.floor(seconds));
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = String(total % 60).padStart(2, "0");
	if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
	return `${minutes}:${secs}`;
}
