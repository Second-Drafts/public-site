import { askConfirm } from "../../lib/confirm";
import { decodeShareHash } from "../teleprompter/lib/share";
import { hasShareParam } from "../teleprompter/lib/share-hash";
import type { Store } from "./lib/state";
import type { UsageHooks } from "./usage-tracking";

export async function openSharedDraft(store: Store, usage: UsageHooks): Promise<void> {
	if (!hasShareParam(location.hash)) return;
	const shared = decodeShareHash(location.hash);
	// Before the confirm, so a reload doesn't ask again.
	history.replaceState(null, "", location.pathname + location.search);
	if (!shared) return;

	const current = store.get().text;
	if (current.trim() !== "" && current !== shared.script) {
		const replace = await askConfirm({
			title: "Analyse this draft?",
			body: "It will replace the draft saved in this browser. Your current draft can't be recovered after this.",
			confirmLabel: "Replace my draft",
			cancelLabel: "Keep mine",
			destructive: true,
		});
		if (!replace) return;
	}
	store.set({ text: shared.script }, "system");
	if (shared.origin === "writing_sprint") usage.onDraftReceivedFromSprint();
}
