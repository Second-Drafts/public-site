import { buildChoices, consent, type ConsentChoices } from "../../lib/privacy/consent";
import { wireDialog } from "../../lib/dialog";
import { CONSENT_CATEGORY_IDS } from "../../lib/privacy/registry";

function required<T extends Element>(selector: string, root: ParentNode = document): T {
	const element = root.querySelector<T>(selector);
	if (!element) throw new Error(`Missing ${selector}`);
	return element;
}

const banner = required<HTMLElement>("[data-consent-banner]");
const status = required<HTMLElement>("[data-consent-status]");
const settings = required<HTMLDialogElement>("[data-consent-settings]");
const switches = new Map(CONSENT_CATEGORY_IDS.map((id) => [id, required<HTMLInputElement>(`#cs-${id}`, settings)]));

function showBannerIfUndecided(): void {
	banner.hidden = consent.decided();
}

function recordChoice(choices: ConsentChoices, source: "banner" | "settings"): void {
	status.textContent = "Your cookie choice is saved.";
	consent.set(choices, source);
}

function renderState(toggle: HTMLInputElement): void {
	required("[data-consent-state]", toggle.parentElement!).textContent = toggle.checked ? "On" : "Off";
}

function openSettings(): void {
	for (const [id, toggle] of switches) {
		toggle.checked = consent.get(id);
		renderState(toggle);
	}
	settings.showModal();
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
required("[data-consent-accept]", banner).addEventListener("click", () =>
	recordChoice(
		buildChoices(() => true),
		"banner",
	),
);
required("[data-consent-reject]", banner).addEventListener("click", () =>
	recordChoice(
		buildChoices(() => false),
		"banner",
	),
);
required("[data-consent-save]", settings).addEventListener("click", saveSettings);
required("[data-consent-cancel]", settings).addEventListener("click", () => settings.close());
document.addEventListener("click", (event) => {
	if (event.target instanceof Element && event.target.closest("[data-open-cookie-settings]")) openSettings();
});
consent.onChange(showBannerIfUndecided);
showBannerIfUndecided();
