/*
 * Fake doors: opens the "Coming soon" dialog for each unbuilt feature and records the answer.
 * Self-mounting: FakeDoors.astro imports this file, and it finds its own DOM. No shared store.
 *
 * Analytics: a click logs tp_fake_door_clicked; an answer logs tp_fake_door_interest. The email
 * address itself is never sent to analytics, only whether one was provided.
 */
import { track } from "./lib/analytics";
import type { FakeDoorFeature } from "./lib/analytics/events";
import { wireDialog } from "./lib/dialog";
import { required } from "./lib/dom";
import { EMAIL_CAPTURE_ENABLED, subscribe } from "./lib/interest";

const CONFIRM_MS = 2000;

const FEATURE_NAMES: Record<FakeDoorFeature, string> = {
	voice_scroll: "Voice scroll",
	record_video: "Record video",
	phone_remote: "Use phone as remote",
};

function isFeature(value: string | undefined): value is FakeDoorFeature {
	return value !== undefined && Object.hasOwn(FEATURE_NAMES, value);
}

function mount(): void {
	const doors = document.querySelectorAll<HTMLButtonElement>("[data-fake-door]");
	const dialog = required<HTMLDialogElement>(document, "[data-fake-door-dialog]");
	const nameEl = required(dialog, "[data-fake-door-name]");
	const askEl = required(dialog, "[data-fake-door-ask]");
	const doneEl = required(dialog, "[data-fake-door-done]");
	const closeButton = required<HTMLButtonElement>(dialog, "[data-close]");
	// Only there while EMAIL_CAPTURE_ENABLED.
	const emailInput = dialog.querySelector<HTMLInputElement>('input[name="email"]');

	let feature: FakeDoorFeature | null = null;
	let opener: HTMLElement | null = null;
	let answered = false;
	let confirmTimer: number | undefined;

	function resetDialog(): void {
		answered = false;
		askEl.hidden = false;
		doneEl.hidden = true;
		if (emailInput) emailInput.value = "";
	}

	function openFor(door: HTMLButtonElement): void {
		if (!isFeature(door.dataset.fakeDoor) || dialog.open) return;
		feature = door.dataset.fakeDoor;
		opener = door;
		resetDialog();
		nameEl.textContent = FEATURE_NAMES[feature];
		track("tp_fake_door_clicked", { feature });
		dialog.showModal();
	}

	/** Blocks an answer only when an email is typed and it is not a valid address. */
	function emailProblem(): boolean {
		if (!EMAIL_CAPTURE_ENABLED || !emailInput || emailInput.value.trim() === "") return false;
		if (emailInput.checkValidity()) return false;
		emailInput.reportValidity();
		return true;
	}

	function answer(interested: boolean): void {
		if (!feature || answered || emailProblem()) return;
		answered = true;

		const email = EMAIL_CAPTURE_ENABLED ? (emailInput?.value.trim() ?? "") : "";
		const emailProvided = email !== "";
		track("tp_fake_door_interest", { feature, interested, email_provided: emailProvided });
		if (emailProvided) {
			subscribe({ email, feature }).catch(() => undefined);
		}

		askEl.hidden = true;
		doneEl.hidden = false;
		closeButton.focus();
		confirmTimer = window.setTimeout(() => dialog.close(), CONFIRM_MS);
	}

	for (const door of doors) {
		door.addEventListener("click", () => openFor(door));
	}

	dialog.addEventListener("click", (event) => {
		const target = event.target as Element;
		const choice = target.closest<HTMLButtonElement>("[data-answer]");
		if (choice) answer(choice.dataset.answer === "yes");
		else if (target.closest("[data-close]")) dialog.close();
	});

	// Esc, Close and a backdrop click all just close; only Yes and Not really record an answer.
	wireDialog(dialog, {
		onClose() {
			window.clearTimeout(confirmTimer);
			confirmTimer = undefined;
			if (opener?.isConnected) opener.focus();
			opener = null;
			feature = null;
		},
	});
}

mount();
