import { splitParagraphs } from "./lib/engine";
import { fontStack, fontWeight, loadFont } from "./lib/fonts";
import type { Align, GuideMode, Settings } from "./lib/settings";
import { required } from "./lib/dom";
import { resolveTheme } from "./lib/themes";

export interface Stage {
	readonly root: HTMLElement;
	readonly scroller: HTMLElement;
	readonly text: HTMLElement;
	/** textContent only: scripts can arrive in share links. */
	render(script: string): void;
	apply(settings: Settings): Promise<void>;
	paragraphIndexOf(target: EventTarget | null): number;
}

export interface StageOptions {
	emptyMessage?: string;
	themeTarget?: HTMLElement;
}

const PARA_CLASS = "tpst-para";

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
			"--tp-weight": String(fontWeight(settings.font, settings.bold)),
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

export function createStage(root: HTMLElement, options: StageOptions = {}): Stage {
	const scroller = required(root, '[data-tpst="scroller"]');
	const text = required(root, '[data-tpst="text"]');
	const emptyMessage = options.emptyMessage ?? "There's no script yet.";

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
			for (const name of ["--tp-fg", "--tp-bg"] as const) options.themeTarget?.style.setProperty(name, look.vars[name]);
			if (root.dataset.align !== look.align) root.dataset.align = look.align;
			if (root.dataset.guide !== look.guide) root.dataset.guide = look.guide;
			const key = `${settings.font}:${settings.bold}`;
			if (key !== fontKey) {
				fontKey = key;
				fontReady = loadFont(settings.font, settings.bold);
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
