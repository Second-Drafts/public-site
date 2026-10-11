import { buildChoices, consent, type ConsentChoices } from "../../lib/privacy/consent";
import { wireDialog } from "../../lib/dialog";
import { required } from "../../lib/dom";
import { CONSENT_CATEGORY_IDS } from "../../lib/privacy/registry";

const banner = required<HTMLElement>(document, "[data-consent-banner]");
const status = required<HTMLElement>(document, "[data-consent-status]");
const settings = required<HTMLDialogElement>(document, "[data-consent-settings]");
const switches = new Map(CONSENT_CATEGORY_IDS.map((id) => [id, required<HTMLInputElement>(settings, `#cs-${id}`)]));

function showBannerIfUndecided(): void {
	banner.hidden = consent.decided();
}

function recordChoice(choices: ConsentChoices, source: "banner" | "settings"): void {
	status.textContent = "Your cookie choice is saved.";
	consent.set(choices, source);
}

function renderState(toggle: HTMLInputElement): void {
	required(toggle.parentElement!, "[data-consent-state]").textContent = toggle.checked ? "On" : "Off";
}

function openSettings(): void {
	for (const [id, toggle] of switches) {
		toggle.checked = consent.get(id);
		renderState(toggle);
	}
	settings.showModal();
}

function chooseAll(granted: boolean): void {
	recordChoice(
		buildChoices(() => granted),
		"banner",
	);
}

function saveSettings(): void {
	settings.close();
	recordChoice(
		buildChoices((id) => switches.get(id)!.checked),
		"settings",
	);
}

wireDialog(settings);
for (const toggle of switches.values()) toggle.addEventListener("change", () => renderState(toggle));
required(banner, "[data-consent-accept]").addEventListener("click", () => chooseAll(true));
required(banner, "[data-consent-reject]").addEventListener("click", () => chooseAll(false));
required(settings, "[data-consent-save]").addEventListener("click", saveSettings);
required(settings, "[data-consent-cancel]").addEventListener("click", () => settings.close());
document.addEventListener("click", (event) => {
	if (event.target instanceof Element && event.target.closest("[data-open-cookie-settings]")) openSettings();
});
consent.onChange(showBannerIfUndecided);
showBannerIfUndecided();
