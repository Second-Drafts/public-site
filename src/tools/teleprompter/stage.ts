/*
 * The prompter stage: the script drawn exactly as it will be read (font, weight, theme colours,
 * size, spacing, column, alignment, reading guide, mirror and flip).
 *
 * One component, two hosts, so they can't drift apart:
 *   - the Prompt view, where the scroll engine drives `scroller` and `text`;
 *   - the Edit view's preview, where people can scroll it by hand.
 *
 * Markup comes from PromptStage.astro. The stage sizes itself to its container, so the guide
 * position and padding are relative to the stage's own height, not the window's.
 */
import { splitParagraphs } from "./lib/engine";
import { fontStack, fontWeight, loadFont } from "./lib/fonts";
import type { Align, GuideMode, Settings } from "./lib/settings";
import { required } from "./lib/dom";
import { resolveTheme } from "./lib/themes";

export interface Stage {
	readonly root: HTMLElement;
	/** The overflow container. The scroll engine drives it in the Prompt view. */
	readonly scroller: HTMLElement;
	/** The element the engine moves with sub-pixel transforms. */
	readonly text: HTMLElement;
	/** Draw the script as paragraphs, with textContent only (scripts can come from share links). */
	render(script: string): void;
	/** Apply every look-and-layout setting. Resolves once the chosen font has loaded (or timed out). */
	apply(settings: Settings): Promise<void>;
	/** Index of the paragraph an event target sits in, or -1 (the gap between paragraphs, the empty note). */
	paragraphIndexOf(target: EventTarget | null): number;
}

export interface StageOptions {
	/** Shown in place of the script when it is empty. Hosts word it for their own context. */
	emptyMessage?: string;
}

const PARA_CLASS = "tpst-para";

/** Custom properties, alignment and guide mode for one set of settings. Pure, for tests. */
export interface StageLook {
	vars: Record<`--tp-${string}`, string>;
	align: Align;
	guide: GuideMode;
}

export function stageLook(settings: Settings): StageLook {
	const theme = resolveTheme(settings);
	return {
		vars: {
			"--tp-fg": theme.text,
			"--tp-bg": theme.background,
			"--tp-guide": theme.guide,
			"--tp-font": fontStack(settings.font),
			"--tp-weight": String(fontWeight(settings.font, theme.bold)),
			"--tp-size": `${settings.fontSize}px`,
			"--tp-lh": String(settings.lineHeight),
			"--tp-col": `${settings.columnWidth}%`,
			"--tp-colpos": String(settings.columnPosition),
			"--tp-guide-pos": String(settings.guidePosition),
			"--tp-guide-opacity": String(settings.guideOpacity),
			"--tp-sx": settings.mirror ? "-1" : "1",
			"--tp-sy": settings.flip ? "-1" : "1",
		},
		align: settings.align,
		guide: settings.guide,
	};
}


/** `root` is the [data-tp-stage] element rendered by PromptStage.astro. */
export function createStage(root: HTMLElement, options: StageOptions = {}): Stage {
	const scroller = required(root, '[data-tpst="scroller"]');
	const text = required(root, '[data-tpst="text"]');
	const emptyMessage = options.emptyMessage ?? "There's no script yet.";

	/** null until the first render, so an empty script still draws the empty message once. */
	let rendered: string | null = null;
	let fontKey = "";
	let fontReady: Promise<void> = Promise.resolve();

	return {
		root,
		scroller,
		text,
		render(script) {
			if (script === rendered) return;
			rendered = script;
			const paragraphs = splitParagraphs(script);
			const fragment = document.createDocumentFragment();
			if (paragraphs.length === 0) {
				const p = document.createElement("p");
				p.className = `${PARA_CLASS} tpst-empty`;
				p.textContent = emptyMessage;
				fragment.append(p);
			}
			paragraphs.forEach((paragraph, index) => {
				const p = document.createElement("p");
				p.className = PARA_CLASS;
				p.dataset.index = String(index);
				p.textContent = paragraph;
				fragment.append(p);
			});
			text.replaceChildren(fragment);
		},
		apply(settings) {
			const look = stageLook(settings);
			for (const [name, value] of Object.entries(look.vars)) root.style.setProperty(name, value);
			if (root.dataset.align !== look.align) root.dataset.align = look.align;
			if (root.dataset.guide !== look.guide) root.dataset.guide = look.guide;
			// Same font and weight as last time: hand back the same promise rather than start another load.
			const bold = resolveTheme(settings).bold;
			const key = `${settings.font}:${bold}`;
			if (key !== fontKey) {
				fontKey = key;
				fontReady = loadFont(settings.font, bold);
			}
			return fontReady;
		},
		paragraphIndexOf(target) {
			if (!(target instanceof Element)) return -1;
			const p = target.closest<HTMLElement>(`.${PARA_CLASS}[data-index]`);
			return p && text.contains(p) ? Number(p.dataset.index) : -1;
		},
	};
}
