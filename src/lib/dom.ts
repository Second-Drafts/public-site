export function required<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
	const found = root.querySelector<T>(selector);
	if (!found) throw new Error(`Markup is missing ${selector}`);
	return found;
}
