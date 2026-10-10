export function required<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
	const found = root.querySelector<T>(selector);
	if (!found) throw new Error(`Teleprompter markup is missing ${selector}`);
	return found;
}

export function inertOutside(element: HTMLElement): () => void {
	const inerted: HTMLElement[] = [];
	let node = element;
	while (node !== document.body && node.parentElement) {
		for (const sibling of node.parentElement.children) {
			if (sibling !== node && sibling instanceof HTMLElement && !sibling.inert && !hostsDialog(sibling)) {
				sibling.inert = true;
				inerted.push(sibling);
			}
		}
		node = node.parentElement;
	}
	return () => {
		for (const sibling of inerted) sibling.inert = false;
	};
}

function hostsDialog(element: HTMLElement): boolean {
	return element instanceof HTMLDialogElement || element.querySelector("dialog[open]") !== null;
}
