import { debounce } from "./debounce";
import type { Store } from "./store";

export type TextInputSource = "paste" | "typed";
export type TextEntrySource = TextInputSource | "restored";

type TextField<State> = { [K in keyof State]: State[K] extends string ? K : never }[keyof State];

const TEXT_SETTLE_MS = 2000;

function inputSource(event: Event): TextInputSource {
	return (event as InputEvent).inputType === "insertFromPaste" ? "paste" : "typed";
}

/** Keeps the textarea and one text field of the store in step, both ways. */
export function bindTextarea<State>(
	textarea: HTMLTextAreaElement,
	store: Store<State>,
	field: TextField<State>,
	onInput?: (source: TextInputSource) => void,
): void {
	function render(state: Readonly<State>) {
		const text = state[field] as string;
		// Only touch the textarea when the value really differs, so the caret stays where it is while typing.
		if (textarea.value !== text) textarea.value = text;
	}

	textarea.addEventListener("input", (event) => {
		store.set({ [field]: textarea.value } as Partial<State>);
		onInput?.(inputSource(event));
	});

	render(store.get());
	store.subscribe(render);
}

/** Calls `report` once input pauses, with "paste" if anything in the burst was pasted. */
export function settledInput(report: (source: TextInputSource) => void): (source: TextInputSource) => void {
	let pendingSource: TextInputSource | null = null;
	const settle = debounce(() => {
		if (pendingSource) report(pendingSource);
		pendingSource = null;
	}, TEXT_SETTLE_MS);

	return (source) => {
		if (source === "paste" || !pendingSource) pendingSource = source;
		settle();
	};
}

/**
 * Reports, once a visit, how the visitor's text arrived: restored text straight away, typing or pasting once the burst
 * settles. Blank text is never reported.
 */
export function trackTextEntry<Source extends string = TextEntrySource>(
	getText: () => string,
	report: (source: Source | TextEntrySource) => void,
) {
	let reported = false;
	function reportEntered(source: Source | TextEntrySource) {
		if (reported || getText().trim() === "") return;
		reported = true;
		report(source);
	}

	reportEntered("restored");

	return { input: settledInput(reportEntered), arrived: reportEntered };
}
