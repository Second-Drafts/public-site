import { required } from "../../lib/dom";
import { buildShareUrl } from "../teleprompter/lib/share";
import type { State, Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

const ANALYSIS_PATH = "/tools/draft-analysis";

export function mountOpenAnalysis(store: Store, usage: UsageHooks): void {
	const link = required<HTMLAnchorElement>(document, "#ws-open-analysis");

	function pointAtCurrentText() {
		link.href = buildShareUrl(ANALYSIS_PATH, { script: store.get().text, origin: "writing_sprint" }).url;
	}

	link.addEventListener("pointerenter", pointAtCurrentText);
	link.addEventListener("focus", pointAtCurrentText);
	link.addEventListener("click", () => {
		pointAtCurrentText();
		usage.onOpenedAnalysis();
	});

	function render({ finished, text }: Readonly<State>) {
		link.hidden = finished === null || text.trim() === "";
	}
	render(store.get());
	store.subscribe(render);
}
