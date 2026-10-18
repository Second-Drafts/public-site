import { required } from "../../lib/dom";
import { addRung, canClimb, editRung, removeRung, type Direction, type Ladder, type Rung } from "./lib/ladder";
import { questionFor } from "./lib/questions";
import type { Store } from "./lib/state";

export interface LadderHooks {
	onRungAdded(direction: Direction): void;
}

type Move = Direction | "remove";

function rungLabel(index: number, count: number): string {
	const position = `Rung ${index + 1} of ${count}`;
	if (count === 1) return position;
	if (index === 0) return `${position}, the most abstract`;
	if (index === count - 1) return `${position}, the most concrete`;
	return position;
}

export function mountLadderView(store: Store, hooks: LadderHooks): void {
	const list = required<HTMLOListElement>(document, "#la-rungs");
	const template = required<HTMLTemplateElement>(document, "#la-rung-template");
	const full = required(document, "#la-full");
	const rungElements = new Map<string, HTMLLIElement>();

	const textOf = (element: HTMLElement) => required<HTMLTextAreaElement>(element, '[data-part="text"]');

	function createRungElement(rung: Rung): HTMLLIElement {
		const element = (template.content.firstElementChild as HTMLLIElement).cloneNode(true) as HTMLLIElement;
		const textId = `la-rung-${rung.id}`;
		element.dataset.rungId = rung.id;
		textOf(element).id = textId;
		required<HTMLLabelElement>(element, '[data-part="label"]').htmlFor = textId;
		rungElements.set(rung.id, element);
		return element;
	}

	function updateRungElement(element: HTMLLIElement, rung: Rung, index: number, ladder: Ladder) {
		const text = textOf(element);
		if (text.value !== rung.text) text.value = rung.text;
		text.placeholder = questionFor(rung);
		required(element, '[data-part="label"]').textContent = rungLabel(index, ladder.length);
		const climbable = canClimb(ladder);
		for (const button of element.querySelectorAll<HTMLButtonElement>('[data-move="up"], [data-move="down"]')) {
			button.disabled = !climbable;
		}
		required(element, '[data-move="remove"]').hidden = ladder.length === 1 && rung.text === "";
	}

	function render({ ladder }: { ladder: Ladder }) {
		const current = new Set(ladder.map((rung) => rung.id));
		for (const [id, element] of rungElements) {
			if (current.has(id)) continue;
			element.remove();
			rungElements.delete(id);
		}
		ladder.forEach((rung, index) => {
			const element = rungElements.get(rung.id) ?? createRungElement(rung);
			const occupant = list.children[index] ?? null;
			if (occupant !== element) list.insertBefore(element, occupant);
			updateRungElement(element, rung, index, ladder);
		});
		full.hidden = canClimb(ladder);
	}

	function focusRung(id: string | undefined) {
		const element = id ? rungElements.get(id) : undefined;
		if (element) textOf(element).focus();
	}

	function move(rungId: string, kind: Move) {
		const { ladder } = store.get();
		if (kind === "remove") {
			const index = ladder.findIndex((rung) => rung.id === rungId);
			const remaining = removeRung(ladder, rungId);
			store.set({ ladder: remaining });
			focusRung(remaining[Math.max(0, index - 1)]?.id);
			return;
		}
		const newId = crypto.randomUUID();
		const climbed = addRung(ladder, rungId, kind, newId);
		if (climbed === ladder) return;
		store.set({ ladder: climbed });
		hooks.onRungAdded(kind);
		focusRung(newId);
	}

	list.addEventListener("input", (event) => {
		const text = event.target as HTMLTextAreaElement;
		const rungId = text.closest<HTMLElement>("[data-rung-id]")?.dataset.rungId;
		if (rungId) store.set({ ladder: editRung(store.get().ladder, rungId, text.value) });
	});

	list.addEventListener("click", (event) => {
		const button = (event.target as Element).closest<HTMLButtonElement>("[data-move]");
		const rungId = button?.closest<HTMLElement>("[data-rung-id]")?.dataset.rungId;
		if (button && rungId) move(rungId, button.dataset.move as Move);
	});

	render(store.get());
	store.subscribe((state, previous) => {
		if (state.ladder !== previous.ladder) render(state);
	});
}

export function focusFirstRung(): void {
	document.querySelector<HTMLTextAreaElement>('#la-rungs [data-part="text"]')?.focus();
}
