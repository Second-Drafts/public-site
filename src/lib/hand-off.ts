import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { findHashParam, HAND_OFF_HASH_KEY } from "./hand-off-hash";
import type { Store } from "./store";
import { isRecord } from "./validate";

const HAND_OFF_ORIGINS = ["word_counter", "writing_sprint"] as const;

export type HandOffOrigin = (typeof HAND_OFF_ORIGINS)[number];

const isHandOffOrigin = (value: unknown): value is HandOffOrigin => HAND_OFF_ORIGINS.some((origin) => origin === value);

/** Text one tool passes to another in a link's hash, so it never leaves the browser. */
export interface HandOff {
	text: string;
	origin?: HandOffOrigin;
}

/** `fields` are extra payload keys only the receiving tool reads, such as the teleprompter's settings. */
export interface ReceivedHandOff extends HandOff {
	fields: Record<string, unknown>;
}

const PAYLOAD_VERSION = 1;

const MAX_TEXT_LENGTH = 200_000;

export function handOffUrl(path: string, { text, origin }: HandOff, fields: Record<string, unknown> = {}): string {
	const body = { v: PAYLOAD_VERSION, t: text, ...fields, ...(origin && { o: origin }) };
	return `${path}#${HAND_OFF_HASH_KEY}=${compressToEncodedURIComponent(JSON.stringify(body))}`;
}

export function readHandOff(hash: string): ReceivedHandOff | null {
	try {
		const encoded = findHashParam(hash, HAND_OFF_HASH_KEY);
		if (!encoded) return null;

		const json = decompressFromEncodedURIComponent(encoded);
		if (!json) return null;

		const data: unknown = JSON.parse(json);
		if (!isRecord(data)) return null;
		const { v, t, o, ...fields } = data;
		if (v !== PAYLOAD_VERSION || typeof t !== "string") return null;

		return { text: capText(t), ...(isHandOffOrigin(o) && { origin: o }), fields };
	} catch {
		return null;
	}
}

function capText(text: string): string {
	if (text.length <= MAX_TEXT_LENGTH) return text;
	let cut = text.slice(0, MAX_TEXT_LENGTH);
	// Don't leave half of a surrogate pair at the end.
	const last = cut.charCodeAt(cut.length - 1);
	if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
	return cut;
}

interface HandOffLinkOptions<State> {
	path: string;
	origin: HandOffOrigin;
	isShown?: (state: Readonly<State>) => boolean;
	onOpen: () => void;
}

/** Points the link at another tool, carrying the current text. Built when the visitor heads for it, not per keystroke. */
export function mountHandOffLink<State extends { text: string }>(
	link: HTMLAnchorElement,
	store: Store<State>,
	{ path, origin, isShown = (state) => state.text.trim() !== "", onOpen }: HandOffLinkOptions<State>,
): void {
	let linkedText: string | undefined;
	function pointAtCurrentText() {
		const { text } = store.get();
		if (text === linkedText) return;
		linkedText = text;
		link.href = handOffUrl(path, { text, origin });
	}

	link.addEventListener("pointerenter", pointAtCurrentText);
	link.addEventListener("focus", pointAtCurrentText);
	link.addEventListener("click", () => {
		pointAtCurrentText();
		onOpen();
	});

	function render(state: Readonly<State>) {
		link.hidden = !isShown(state);
	}
	render(store.get());
	store.subscribe(render);
}
