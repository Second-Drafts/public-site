import { askConfirm } from "../../lib/confirm";
import { required } from "../../lib/dom";
import { focusFirstRung } from "./ladder-view";
import { EXAMPLE_LADDER } from "./lib/example";
import { isBlank, ladderText, passageText, startingRung } from "./lib/ladder";
import type { Store } from "./lib/state";

export type CopiedView = "ladder" | "passage";

export interface ToolHooks {
	onCopied(view: CopiedView): void;
	onExampleLoaded(): void;
}

const COPIED_LABEL_MS = 2000;

interface CopyAction {
	selector: string;
	view: CopiedView;
	text: () => string;
}

export function mountLadderTools(store: Store, hooks: ToolHooks): void {
	const status = required(document, "#la-status");
	const say = (message: string) => (status.textContent = message);

	function mountCopyButton({ selector, view, text }: CopyAction): HTMLButtonElement {
		const button = required<HTMLButtonElement>(document, selector);
		const label = required(button, ".sd-btn__label");
		const restingLabel = label.textContent ?? "";
		let restore: ReturnType<typeof setTimeout> | undefined;

		button.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(text());
			} catch {
				say(`We couldn't copy the ${view} for you. Select the text and copy it yourself.`);
				return;
			}
			say(`Your ${view} is copied.`);
			label.textContent = "Copied";
			clearTimeout(restore);
			restore = setTimeout(() => (label.textContent = restingLabel), COPIED_LABEL_MS);
			hooks.onCopied(view);
		});
		return button;
	}

	const copyLadder = mountCopyButton({
		selector: "#la-copy-ladder",
		view: "ladder",
		text: () => ladderText(store.get().ladder),
	});
	const copyPassage = mountCopyButton({
		selector: "#la-copy-passage",
		view: "passage",
		text: () => passageText(store.get().ladder, store.get().passageOrder),
	});

	async function confirmReplacing(title: string, confirmLabel: string): Promise<boolean> {
		if (isBlank(store.get().ladder)) return true;
		return askConfirm({ title, body: "Your current ladder will be cleared.", confirmLabel, destructive: true });
	}

	required(document, "#la-example").addEventListener("click", async () => {
		if (!(await confirmReplacing("Replace your ladder with the example?", "Replace"))) return;
		store.set({ ladder: EXAMPLE_LADDER });
		say("Example ladder loaded, five rungs from an idea down to a detail.");
		hooks.onExampleLoaded();
	});

	required(document, "#la-start-over").addEventListener("click", async () => {
		if (!(await confirmReplacing("Start a new ladder?", "Start over"))) return;
		store.set({ ladder: [startingRung(crypto.randomUUID())] });
		say("New ladder started.");
		focusFirstRung();
	});

	function render() {
		const { ladder, passageOrder } = store.get();
		copyLadder.disabled = isBlank(ladder);
		copyPassage.disabled = passageText(ladder, passageOrder) === "";
	}
	render();
	store.subscribe(render);
}
