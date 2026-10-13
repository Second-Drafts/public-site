import { required } from "../../lib/dom";
import { buildShareUrl } from "../teleprompter/lib/share";
import type { Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

const TELEPROMPTER_PATH = "/tools/teleprompter";

export function mountOpenInTeleprompter(store: Store, usage: UsageHooks): void {
	const link = required<HTMLAnchorElement>(document, "#wc-open-teleprompter");

	function pointAtCurrentText() {
		link.href = buildShareUrl(TELEPROMPTER_PATH, { script: store.get().text, origin: "word_counter" }).url;
	}

	link.addEventListener("pointerenter", pointAtCurrentText);
	link.addEventListener("focus", pointAtCurrentText);
	link.addEventListener("click", () => {
		pointAtCurrentText();
		usage.onOpenedInTeleprompter();
	});

	function render({ text }: Readonly<{ text: string }>) {
		link.hidden = text.trim() === "";
	}
	render(store.get());
	store.subscribe(render);
}
