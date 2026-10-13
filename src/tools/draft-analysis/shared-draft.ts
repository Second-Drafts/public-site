import { askConfirm } from "../../lib/confirm";
import { takeHandOffFromUrl } from "../../lib/hand-off-hash";
import type { Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

export async function openSharedDraft(store: Store, usage: UsageHooks): Promise<void> {
	const shared = await takeHandOffFromUrl();
	if (!shared) return;

	const current = store.get().text;
	if (current.trim() !== "" && current !== shared.text) {
		const replace = await askConfirm({
			title: "Analyse this draft?",
			body: "It will replace the draft saved in this browser. Your current draft can't be recovered after this.",
			confirmLabel: "Replace my draft",
			cancelLabel: "Keep mine",
			destructive: true,
		});
		if (!replace) return;
	}
	store.set({ text: shared.text }, "system");
	if (shared.origin === "writing_sprint") usage.onDraftReceivedFromSprint();
}
