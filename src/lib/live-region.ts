import { debounce } from "./debounce";

const ANNOUNCE_AFTER_MS = 1000;

/**
 * Announces through a live region once the message stops changing, so a screen reader hears where the text settled
 * rather than every keystroke. `alreadySaid` is what the page said on load, which shouldn't be announced again.
 */
export function settledAnnouncer(region: HTMLElement, alreadySaid: string): (message: string) => void {
	let announced = alreadySaid;
	return debounce((message: string) => {
		if (message === announced) return;
		announced = message;
		region.textContent = message;
	}, ANNOUNCE_AFTER_MS);
}
