import { askConfirm } from "./confirm";
import { defaultSettingsForViewport } from "./lib/defaults";
import { required } from "./lib/dom";
import { loadFontPreviews } from "./lib/fonts";
import { isThemeId, LIMITS, type CustomColors, type NumericSetting, type Settings } from "./lib/settings";
import type { Store } from "./lib/store";
import { contrastRatio, MIN_CONTRAST } from "./lib/color";
import { bandContrast, CUSTOM_GUIDE, GUIDE_COLORS, pickTheme, resolveTheme } from "./lib/themes";

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

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
const CUSTOM_KEYS: (keyof CustomColors)[] = ["text", "background"];
const PRESET_GUIDE_COLORS: readonly string[] = GUIDE_COLORS.map((color) => color.value);

const NARROW_TO_MOVE_HINT = "Narrow the column to move it.";

function setWarningText(el: HTMLElement, text: string) {
	const textEl = required(el, "[data-warning-text]");
	if (textEl.textContent !== text) textEl.textContent = text;
}

function showWarning(el: HTMLElement, text: string) {
	el.dataset.tone = "low";
	setWarningText(el, text);
}

function showQuietNote(el: HTMLElement, text: string) {
	delete el.dataset.tone;
	setWarningText(el, text);
}

function clearWarning(el: HTMLElement) {
	showQuietNote(el, "");
}

function setRangeDisabled(input: HTMLInputElement, control: HTMLElement, disabled: boolean) {
	input.disabled = disabled;
	control.toggleAttribute("data-disabled", disabled);
}

export function mountSettingsPanel(root: HTMLElement, store: Store): void {
	const one = <T extends HTMLElement = HTMLElement>(selector: string) => required<T>(root, selector);

	const customBox = one('[data-tps="custom"]');
	const customCard = one('[data-tps="custom-card"]');
	const contrast = one('[data-tps="contrast"]');
	const resetButton = one<HTMLButtonElement>('[data-tps="reset"]');
	const fontCards = one('[data-tps="fonts"]');

	const radios = [...root.querySelectorAll<HTMLInputElement>('input[type="radio"][data-setting]')];
	const guideRadios = radios.filter((radio) => radio.dataset.setting === "guideColor");
	const ranges = new Map(NUMERIC.map((key) => [key, one<HTMLInputElement>(`input[type="range"][data-setting="${key}"]`)]));
	const outputs = new Map(NUMERIC.map((key) => [key, one<HTMLOutputElement>(`[data-out="${key}"]`)]));
	const rangeControls = new Map(NUMERIC.map((key) => [key, one(`[data-ctl="${key}"]`)]));
	const toggles = new Map(TOGGLES.map((key) => [key, one<HTMLInputElement>(`input[type="checkbox"][data-setting="${key}"]`)]));
	const pickers = new Map(CUSTOM_KEYS.map((key) => [key, one<HTMLInputElement>(`input[data-custom="${key}"]`)]));
	const hexes = new Map(CUSTOM_KEYS.map((key) => [key, one(`[data-hex="${key}"]`)]));
	const guideCtl = one('[data-ctl="guideColor"]');
	const guidePicker = one<HTMLInputElement>("input[data-guide-custom]");
	const guideCustom = one("[data-swc-custom]");
	const guideThemeDot = one('[data-swc="auto"]');
	const bandWarn = one('[data-warn="guideOpacity"]');
	const positionHint = one('[data-ctl="columnPosition"] .ctl__hint');
	const positionHintText = positionHint.textContent;
	let pickerSeeded = false;

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

		for (const key of TOGGLES) toggles.get(key)!.checked = settings[key];

		const setSettingRangeDisabled = (key: NumericSetting, disabled: boolean) =>
			setRangeDisabled(ranges.get(key)!, rangeControls.get(key)!, disabled);
		setSettingRangeDisabled("guideOpacity", settings.guide !== "band");
		setSettingRangeDisabled("guidePosition", settings.guide === "off");

		const columnFillsStage = settings.columnWidth >= LIMITS.columnWidth.max;
		setSettingRangeDisabled("columnPosition", columnFillsStage);
		const hintText = columnFillsStage ? NARROW_TO_MOVE_HINT : positionHintText;
		if (positionHint.textContent !== hintText) positionHint.textContent = hintText;

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
			showWarning(bandWarn, `The band makes the line hard to read: ${shown}. Lower the opacity or pick another colour.`);
		} else {
			clearWarning(bandWarn);
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
		if (ratio < MIN_CONTRAST) {
			showWarning(contrast, `Low contrast: ${shown}. Text may be hard to read; aim for at least ${MIN_CONTRAST}:1.`);
		} else {
			showQuietNote(contrast, `Contrast ${shown}. Easy to read.`);
		}
	}

	function render() {
		const { settings } = store.get();
		renderControls(settings);
		renderCustom(settings);
	}

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
		if (target.type === "checkbox") store.set({ settings: { [key]: target.checked } });
		else if (key === "theme" && isThemeId(target.value)) store.set({ settings: pickTheme(target.value) });
		else if (target.type === "radio") store.set({ settings: { [key]: target.value } });
	});

	resetButton.addEventListener("click", async () => {
		const confirmed = await askConfirm({
			title: "Reset all settings?",
			body: "Font, colours, layout and playback go back to their defaults. Your script stays as it is.",
			confirmLabel: "Reset settings",
			cancelLabel: "Keep them",
		});
		// Not a choice the reader made: analytics doesn't count it.
		if (confirmed) store.set({ settings: defaultSettingsForViewport() }, "system");
	});

	store.subscribe((state, previous) => {
		if (state.settings !== previous.settings) render();
	});
	render();

	// Picker labels need only a few glyphs of each font, fetched once the Font group is on screen.
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
