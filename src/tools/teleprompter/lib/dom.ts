/** The first match inside `root`, or a named error, so a missing element fails loudly at mount. */
export function required<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
	const found = root.querySelector<T>(selector);
	if (!found) throw new Error(`Teleprompter markup is missing ${selector}`);
	return found;
}
