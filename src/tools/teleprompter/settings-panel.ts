/*
 * Settings panel: font picker, theme swatches and custom colours, layout sliders, guide (style, colour,
 * position, opacity), mirror/flip,
 * countdown, reset to defaults. Reads and writes Settings through the store only.
 * Markup: SettingsPanel.astro + SettingsControl.astro. The DOM is static; render() sets it from the store
 * on every change, so Reset and share links update the UI the same way a click does.
 * The panel can appear more than once (Edit page, Prompt drawer): mount each [data-tp-settings] root on its
 * own. Every query stays inside `root`; the panels stay in step through the store.
 */
import { askConfirm } from "./confirm";
import { defaultSettingsForViewport } from "./lib/defaults";
import { required } from "./lib/dom";
import { loadFontPreviews } from "./lib/fonts";
import { LIMITS, type CustomColors, type NumericSetting, type Settings } from "./lib/settings";
import type { Store } from "./lib/store";
import { bandContrast, contrastRatio, CUSTOM_GUIDE, GUIDE_COLORS, MIN_CONTRAST, resolveTheme, THEMES } from "./lib/themes";

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

/** Text shown in each slider's <output>. */
const FORMAT: Record<NumericSetting, (value: number) => string> = {
	fontSize: (v) => `${Math.round(v)} px`,
	lineHeight: (v) => v.toFixed(1),
	columnWidth: (v) => `${Math.round(v)}%`,
	columnPosition: (v) => {
		const pct = Math.round(v * 100);
		return pct <= 0 ? "Left" : pct === 50 ? "Center" : pct >= 100 ? "Right" : `${pct}% from left`;
	},
	guidePosition: (v) => `${percent(v)} from top`,
	guideOpacity: (v) => percent(v),
	speed: (v) => `${Math.round(v)}`,
};
const NUMERIC = Object.keys(LIMITS) as NumericSetting[];
type ToggleSetting = "bold" | "countdown" | "mirror" | "flip";
const TOGGLES: ToggleSetting[] = ["bold", "countdown", "mirror", "flip"];
/** The Custom theme's own pickers. Its guide colour is set by the Colour control now. */
const CUSTOM_KEYS: (keyof CustomColors)[] = ["text", "background"];
const PRESET_GUIDE_COLORS: readonly string[] = GUIDE_COLORS.map((color) => color.value);

/**
 * Fill a SettingsWarning: `text` shows as a warning, null clears it. `quiet` is shown in its place without
 * the alarm, for a line that is useful even when nothing is wrong. The warning's last child is its text.
 */
function renderWarning(el: HTMLElement, text: string | null, quiet = "") {
	if (text === null) delete el.dataset.tone;
	else el.dataset.tone = "low";
	const message = text ?? quiet;
	const textEl = el.lastElementChild!;
	if (textEl.textContent !== message) textEl.textContent = message;
}

export function mountSettingsPanel(root: HTMLElement, store: Store): void {
	const one = <T extends HTMLElement = HTMLElement>(selector: string) => required<T>(root, selector);
	const all = <T extends Element>(selector: string) => [...root.querySelectorAll<T>(selector)];

	const customBox = one('[data-tps="custom"]');
	const customCard = one('[data-tps="custom-card"]');
	const contrast = one('[data-tps="contrast"]');
	const resetButton = one<HTMLButtonElement>('[data-tps="reset"]');
	const fontCards = one('[data-tps="fonts"]');

	// Every radio in the panel, from the markup: its data-setting is the Settings key, its value the choice.
	const radios = all<HTMLInputElement>('input[type="radio"][data-setting]');
	const guideRadios = radios.filter((radio) => radio.dataset.setting === "guideColor");
	const ranges = new Map(NUMERIC.map((key) => [key, one<HTMLInputElement>(`input[type="range"][data-setting="${key}"]`)]));
	const outputs = new Map(NUMERIC.map((key) => [key, one<HTMLOutputElement>(`[data-out="${key}"]`)]));
	const rangeControls = new Map(NUMERIC.map((key) => [key, one(`[data-ctl="${key}"]`)]));
	const toggles = new Map(TOGGLES.map((key) => [key, one<HTMLInputElement>(`input[type="checkbox"][data-setting="${key}"]`)]));
	const boldControl = one('[data-ctl="bold"]');
	const pickers = new Map(CUSTOM_KEYS.map((key) => [key, one<HTMLInputElement>(`input[data-custom="${key}"]`)]));
	const hexes = new Map(CUSTOM_KEYS.map((key) => [key, one(`[data-hex="${key}"]`)]));
	const guideCtl = one('[data-ctl="guideColor"]');
	const guidePicker = one<HTMLInputElement>("input[data-guide-custom]");
	const guideCustom = one("[data-swc-custom]");
	const guideThemeDot = one('[data-swc="auto"]');
	const bandWarn = one('[data-warn="guideOpacity"]');
	// Hints that read differently in a control's other state: the normal text is what the markup shows.
	const altHints = all<HTMLElement>("[data-hint-alt]").map((el) => ({
		el,
		control: el.closest<HTMLElement>("[data-ctl]")!.dataset.ctl,
		normal: el.textContent,
		alt: el.dataset.hintAlt!,
	}));
	let pickerSeeded = false;

	/* ------------------------------------------------------------------ rendering */

	function renderControls(settings: Settings) {
		for (const radio of radios) {
			radio.checked = radio.value === String(settings[radio.dataset.setting as keyof Settings]);
		}

		for (const key of NUMERIC) {
			const input = ranges.get(key)!;
			const value = settings[key];
			if (Number(input.value) !== value) input.value = String(value);
			outputs.get(key)!.textContent = FORMAT[key](value);
			input.setAttribute("aria-valuetext", FORMAT[key](value));
		}

		const { bold } = resolveTheme(settings);
		for (const key of TOGGLES) {
			toggles.get(key)!.checked = key === "bold" ? bold : settings[key];
		}
		// High contrast forces bold: show it on, and don't offer a choice that wouldn't do anything.
		const boldForced = settings.theme !== "custom" && Boolean(THEMES[settings.theme].forceBold);
		toggles.get("bold")!.disabled = boldForced;
		boldControl.toggleAttribute("data-disabled", boldForced);

		// Band opacity only means something for the band; position means nothing with the guide off.
		const setDisabled = (key: NumericSetting, disabled: boolean) => {
			ranges.get(key)!.disabled = disabled;
			rangeControls.get(key)!.toggleAttribute("data-disabled", disabled);
		};
		setDisabled("guideOpacity", settings.guide !== "band");
		setDisabled("guidePosition", settings.guide === "off");

		// The column can only move when it's narrower than the stage.
		const noRoom = settings.columnWidth >= LIMITS.columnWidth.max;
		setDisabled("columnPosition", noRoom);

		const inOtherState: Record<string, boolean> = { bold: boldForced, columnPosition: noRoom };
		for (const hint of altHints) {
			const text = inOtherState[hint.control ?? ""] ? hint.alt : hint.normal;
			if (hint.el.textContent !== text) hint.el.textContent = text;
		}

		renderGuideColor(settings);
		renderBandWarning(settings);
	}

	function renderGuideColor(settings: Settings) {
		const { guideColor } = settings;
		const isOwn = guideColor !== "auto" && !PRESET_GUIDE_COLORS.includes(guideColor);
		// The Theme swatch shows what "auto" would give right now, so it follows theme changes.
		guideThemeDot.style.setProperty("--swc", resolveTheme({ ...settings, guideColor: "auto" }).guide);
		// The picker remembers its last colour when another swatch is chosen; first time, it starts from the theme's.
		if (guideColor !== "auto") {
			if (guidePicker.value !== guideColor) guidePicker.value = guideColor;
			pickerSeeded = true;
		} else if (!pickerSeeded) {
			guidePicker.value = resolveTheme(settings).guide;
			pickerSeeded = true;
		}
		guideCustom.toggleAttribute("data-selected", isOwn);
		// Unchosen, Custom stays an empty ring; chosen, it shows its colour.
		if (isOwn) guideCustom.style.setProperty("--swc", guidePicker.value);
		else guideCustom.style.removeProperty("--swc");
		const off = settings.guide === "off";
		guideCtl.toggleAttribute("data-disabled", off);
		guidePicker.disabled = off;
		for (const radio of guideRadios) radio.disabled = off;
	}

	function renderBandWarning(settings: Settings) {
		const ratio = bandContrast(settings);
		if (ratio !== null && ratio < MIN_CONTRAST) {
			// Round down, so a ratio just under the line never reads as "4.5:1".
			const shown = `${(Math.floor(ratio * 10) / 10).toFixed(1)}:1`;
			renderWarning(bandWarn, `The band makes the line hard to read: ${shown}. Lower the opacity or pick another colour.`);
		} else {
			renderWarning(bandWarn, null);
		}
	}

	function renderCustom(settings: Settings) {
		const isCustom = settings.theme === "custom";
		customBox.hidden = !isCustom;
		customCard.style.setProperty("--sw-bg", settings.custom.background);
		customCard.style.setProperty("--sw-fg", settings.custom.text);
		customCard.style.setProperty("--sw-guide", CUSTOM_GUIDE);

		for (const key of CUSTOM_KEYS) {
			const picker = pickers.get(key)!;
			if (picker.value !== settings.custom[key]) picker.value = settings.custom[key];
			hexes.get(key)!.textContent = settings.custom[key];
		}

		const ratio = contrastRatio(settings.custom.text, settings.custom.background);
		const shown = `${ratio.toFixed(1)}:1`;
		renderWarning(
			contrast,
			ratio < MIN_CONTRAST ? `Low contrast: ${shown}. Text may be hard to read; aim for at least ${MIN_CONTRAST}:1.` : null,
			`Contrast ${shown}. Easy to read.`,
		);
	}

	function render() {
		const { settings } = store.get();
		renderControls(settings);
		renderCustom(settings);
	}

	/* ------------------------------------------------------------------ input → store */

	root.addEventListener("submit", (event) => event.preventDefault());

	root.addEventListener("input", (event) => {
		const target = event.target as HTMLInputElement;
		if (target.type === "range") {
			const key = target.dataset.setting as NumericSetting;
			store.set({ settings: { [key]: Number(target.value) } });
		} else if (target.type === "color" && target.hasAttribute("data-guide-custom")) {
			// Picking a colour selects Custom: the colour is the setting.
			store.set({ settings: { guideColor: target.value as Settings["guideColor"] } });
		} else if (target.type === "color") {
			const key = target.dataset.custom as keyof CustomColors;
			store.set({ settings: { custom: { ...store.get().settings.custom, [key]: target.value } } });
		}
	});

	root.addEventListener("change", (event) => {
		const target = event.target as HTMLInputElement;
		const key = target.dataset.setting;
		if (!key) return;
		// The markup's radios and checkboxes are the only source of keys and values.
		if (target.type === "checkbox") store.set({ settings: { [key]: target.checked } });
		else if (target.type === "radio") store.set({ settings: { [key]: target.value } });
	});

	resetButton.addEventListener("click", async () => {
		const confirmed = await askConfirm({
			title: "Reset all settings?",
			body: "Font, colours, layout and playback go back to their defaults. Your script stays as it is.",
			confirmLabel: "Reset settings",
			cancelLabel: "Keep them",
		});
		// The tool resetting itself, not a choice the reader made: analytics doesn't count it.
		if (confirmed) store.set({ settings: defaultSettingsForViewport() }, "system");
	});

	/* ------------------------------------------------------------------ start */

	store.subscribe((state, previous) => {
		if (state.settings !== previous.settings) render();
	});
	render();

	// The stage loads the chosen font (stage.apply). The picker labels need only a few glyphs of each,
	// fetched once the Font group is on screen.
	if ("IntersectionObserver" in window) {
		const seen = new IntersectionObserver((entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			seen.disconnect();
			void loadFontPreviews();
		});
		seen.observe(fontCards);
	} else {
		void loadFontPreviews();
	}
}
