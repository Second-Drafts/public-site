import type { FontId } from "./settings";

export interface FontOption {
	id: FontId;
	label: string;
	note: string;
	family: string;
	fallback: string;
	weights: { regular: number; bold: number };
}

export const FONTS: Record<FontId, FontOption> = {
	clean: {
		id: "clean",
		label: "Clean",
		note: "Neutral and very legible",
		family: "Inter",
		fallback: "system-ui, sans-serif",
		weights: { regular: 400, bold: 700 },
	},
	classic: {
		id: "classic",
		label: "Classic",
		note: "A serif, for those who prefer one",
		family: "Source Serif 4",
		fallback: "Georgia, serif",
		weights: { regular: 400, bold: 700 },
	},
	hyperlegible: {
		id: "hyperlegible",
		label: "Hyperlegible",
		note: "Made for low vision; dyslexia-friendly",
		family: "Atkinson Hyperlegible",
		fallback: "system-ui, sans-serif",
		weights: { regular: 400, bold: 700 },
	},
	condensed: {
		id: "condensed",
		label: "Condensed",
		note: "More words per line on small screens",
		family: "Barlow Condensed",
		fallback: "'Arial Narrow', sans-serif-condensed, sans-serif",
		weights: { regular: 500, bold: 700 },
	},
	display: {
		id: "display",
		label: "Bold display",
		note: "Heavy strokes that read from across a room",
		family: "Archivo",
		fallback: "system-ui, sans-serif",
		weights: { regular: 700, bold: 900 },
	},
	mono: {
		id: "mono",
		label: "Mono",
		note: "An even rhythm some readers prefer",
		family: "JetBrains Mono",
		fallback: "ui-monospace, monospace",
		weights: { regular: 400, bold: 700 },
	},
};

const API = "https://fonts.googleapis.com/css2";
const familyParam = (font: FontOption, weights: number[]) =>
	`family=${font.family.replace(/ /g, "+")}:wght@${weights.join(";")}`;

export const fontStack = (id: FontId) => `"${FONTS[id].family}", ${FONTS[id].fallback}`;

export const previewStack = (id: FontId) => `"tp-preview-${id}", ${FONTS[id].fallback}`;

export const fontWeight = (id: FontId, bold: boolean) => FONTS[id].weights[bold ? "bold" : "regular"];

const requested = new Set<FontId>();

export function loadFont(id: FontId, bold = false): Promise<void> {
	const font = FONTS[id];
	if (!requested.has(id)) {
		requested.add(id);
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = `${API}?${familyParam(font, [font.weights.regular, font.weights.bold])}&display=swap`;
		document.head.append(link);
	}
	const ready = document.fonts?.load(`${fontWeight(id, bold)} 1em "${font.family}"`).then(() => undefined);
	if (!ready) return Promise.resolve();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<void>((resolve) => (timer = setTimeout(resolve, 3000)));
	return Promise.race([ready, timeout])
		.catch(() => undefined)
		.finally(() => clearTimeout(timer));
}

let previewsRequested = false;

// Renamed to "tp-preview-<id>" so these subset faces never stand in for the full fonts.
export async function loadFontPreviews(): Promise<void> {
	if (previewsRequested) return;
	previewsRequested = true;
	const fonts = Object.values(FONTS);
	const families = fonts.map((font) => familyParam(font, [font.weights.regular])).join("&");
	const glyphs = [...new Set(fonts.map((font) => font.label).join(""))].join("");
	try {
		const response = await fetch(`${API}?${families}&text=${encodeURIComponent(glyphs)}&display=swap`);
		if (!response.ok) return;
		let css = await response.text();
		for (const font of fonts) {
			css = css.replaceAll(`font-family: '${font.family}'`, `font-family: 'tp-preview-${font.id}'`);
		}
		const style = document.createElement("style");
		style.dataset.tpFontPreviews = "";
		style.textContent = css;
		document.head.append(style);
	} catch {
	}
}
