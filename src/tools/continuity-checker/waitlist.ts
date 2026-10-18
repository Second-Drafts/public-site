import { track } from "../../lib/analytics";
import type { WaitlistPlacement } from "../../lib/analytics/events";

export const WAITLIST_URL = "/tools/continuity-checker/waitlist/";

const PLACEMENTS: readonly WaitlistPlacement[] = ["hero", "band", "home"];

function isPlacement(value: string | undefined): value is WaitlistPlacement {
	return PLACEMENTS.some((placement) => placement === value);
}

export function mountWaitlistLinks(): void {
	for (const link of document.querySelectorAll<HTMLElement>("[data-waitlist-placement]")) {
		const placement = link.dataset.waitlistPlacement;
		if (!isPlacement(placement)) continue;
		link.addEventListener("click", () => track("cc_waitlist_clicked", { placement }));
	}
}
