import { consent, type ConsentChoices } from "../../lib/privacy/consent";
import { wireDialog } from "../../lib/dialog";
import { consentSettingsModel } from "./consentSettingsModel";

function required<T extends Element>(selector: string): T {
	const element = document.querySelector<T>(selector);
	if (!element) throw new Error(`Missing ${selector}`);
	return element;
}

const banner = required<HTMLElement>("[data-consent-banner]");
const status = required<HTMLElement>("[data-consent-status]");
const settings = required<HTMLDialogElement>("[data-consent-settings]");
const switches = Array.from(settings.querySelectorAll<HTMLInputElement>("[data-consent-category]"));

function choicesFrom(isGranted: (id: string) => boolean): ConsentChoices {
	return Object.fromEntries(consentSettingsModel().map(({ id }) => [id, isGranted(id)])) as ConsentChoices;
}

function showBannerIfUndecided(): void {
	banner.hidden = consent.decided();
}

function recordChoice(choices: ConsentChoices, source: "banner" | "settings"): void {
	status.textContent = "Your cookie choice is saved.";
	consent.set(choices, source);
}

function renderState(toggle: HTMLInputElement): void {
	const state = toggle.parentElement?.querySelector("[data-consent-state]");
	if (state) state.textContent = toggle.checked ? "On" : "Off";
}

function openSettings(): void {
	for (const toggle of switches) {
		toggle.checked = consent.get(toggle.dataset.consentCategory as Parameters<typeof consent.get>[0]);
		renderState(toggle);
	}
	settings.showModal();
}

function saveSettings(): void {
	const granted = new Set(switches.filter((toggle) => toggle.checked).map((toggle) => toggle.dataset.consentCategory));
	settings.close();
	recordChoice(
		choicesFrom((id) => granted.has(id)),
		"settings",
	);
}

wireDialog(settings);
for (const toggle of switches) toggle.addEventListener("change", () => renderState(toggle));
banner.querySelector("[data-consent-accept]")?.addEventListener("click", () =>
	recordChoice(
		choicesFrom(() => true),
		"banner",
	),
);
banner.querySelector("[data-consent-reject]")?.addEventListener("click", () =>
	recordChoice(
		choicesFrom(() => false),
		"banner",
	),
);
settings.querySelector("[data-consent-save]")?.addEventListener("click", saveSettings);
settings.querySelector("[data-consent-cancel]")?.addEventListener("click", () => settings.close());
document.addEventListener("click", (event) => {
	if (event.target instanceof Element && event.target.closest("[data-open-cookie-settings]")) openSettings();
});
consent.onChange(showBannerIfUndecided);
showBannerIfUndecided();
