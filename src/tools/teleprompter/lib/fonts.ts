import type { FontId } from "./settings";

export interface FontOption {
	id: FontId;
	label: string;
	note: string;
	family: string;
	file: string;
	fallback: string;
	weights: { regular: number; bold: number };
}

export const FONTS: Record<FontId, FontOption> = {
	clean: {
		id: "clean",
		label: "Clean",
		note: "Neutral and very legible",
		family: "Inter",
		file: "inter",
		fallback: "system-ui, sans-serif",
		weights: { regular: 400, bold: 700 },
	},
	classic: {
		id: "classic",
		label: "Classic",
		note: "A serif, for those who prefer one",
		family: "Source Serif 4",
		file: "source-serif-4",
		fallback: "Georgia, serif",
		weights: { regular: 400, bold: 700 },
	},
	hyperlegible: {
		id: "hyperlegible",
		label: "Hyperlegible",
		note: "Made for low vision; dyslexia-friendly",
		family: "Atkinson Hyperlegible",
		file: "atkinson-hyperlegible",
		fallback: "system-ui, sans-serif",
		weights: { regular: 400, bold: 700 },
	},
	condensed: {
		id: "condensed",
		label: "Condensed",
		note: "More words per line on small screens",
		family: "Barlow Condensed",
		file: "barlow-condensed",
		fallback: "'Arial Narrow', sans-serif-condensed, sans-serif",
		weights: { regular: 500, bold: 700 },
	},
	display: {
		id: "display",
		label: "Bold display",
		note: "Heavy strokes that read from across a room",
		family: "Archivo",
		file: "archivo",
		fallback: "system-ui, sans-serif",
		weights: { regular: 700, bold: 900 },
	},
	mono: {
		id: "mono",
		label: "Mono",
		note: "An even rhythm some readers prefer",
		family: "JetBrains Mono",
		file: "jetbrains-mono",
		fallback: "ui-monospace, monospace",
		weights: { regular: 400, bold: 700 },
	},
};

export const fontStack = (id: FontId) => `"${FONTS[id].family}", ${FONTS[id].fallback}`;

export const fontWeight = (id: FontId, bold: boolean) => FONTS[id].weights[bold ? "bold" : "regular"];

const faces = new Map<string, Promise<void>>();

function loadFace(font: FontOption, weight: number): Promise<void> {
	const url = `/fonts/${font.file}-${weight}.woff2`;
	let loaded = faces.get(url);
	if (!loaded) {
		const face = new FontFace(font.family, `url(${url}) format("woff2")`, { weight: String(weight), display: "swap" });
		document.fonts.add(face);
		loaded = face.load().then(
			() => undefined,
			() => undefined,
		);
		faces.set(url, loaded);
	}
	return loaded;
}

export function loadFont(id: FontId, bold = false): Promise<void> {
	const font = FONTS[id];
	const wanted = fontWeight(id, bold);
	void loadFace(font, fontWeight(id, !bold));
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<void>((resolve) => (timer = setTimeout(resolve, 3000)));
	return Promise.race([loadFace(font, wanted), timeout]).finally(() => clearTimeout(timer));
}

export function loadFontPreviews(): void {
	for (const font of Object.values(FONTS)) void loadFace(font, font.weights.regular);
}
