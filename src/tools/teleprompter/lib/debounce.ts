/** Trailing-edge debounce with a flush, so a pending save can be written on pagehide. */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let pending: A | undefined;
	const run = () => {
		timer = undefined;
		if (pending) {
			const args = pending;
			pending = undefined;
			fn(...args);
		}
	};
	const debounced = (...args: A) => {
		pending = args;
		clearTimeout(timer);
		timer = setTimeout(run, ms);
	};
	debounced.flush = () => {
		clearTimeout(timer);
		run();
	};
	return debounced;
}
