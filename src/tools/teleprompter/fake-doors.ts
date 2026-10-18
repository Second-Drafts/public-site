import { track } from "../../lib/usage-reports";
import type { FakeDoorFeature } from "../../lib/analytics/events";
import { wireDialog } from "../../lib/dialog";
import { required } from "../../lib/dom";
import { sendSignup } from "../../lib/forms/client";
import { parseSignup } from "../../lib/forms/submission";

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
	const nameEls = dialog.querySelectorAll<HTMLElement>("[data-fake-door-name]");
	const askEl = required(dialog, "[data-fake-door-ask]");
	const doneEl = required(dialog, "[data-fake-door-done]");
	const notedEl = required(dialog, "[data-fake-door-noted]");
	const subscribedEl = required(dialog, "[data-fake-door-subscribed]");
	const closeButton = required<HTMLButtonElement>(dialog, "[data-close]");
	const emailInput = required<HTMLInputElement>(dialog, 'input[name="email"]');
	const answerButtons = dialog.querySelectorAll<HTMLButtonElement>("[data-answer]");

	let feature: FakeDoorFeature | null = null;
	let opener: HTMLElement | null = null;
	let answering = false;
	let confirmTimer: number | undefined;

	function resetDialog(): void {
		answering = false;
		askEl.hidden = false;
		doneEl.hidden = true;
		emailInput.value = "";
		showProblem(null);
	}

	function showProblem(problem: "email" | "save" | null): void {
		for (const message of dialog.querySelectorAll<HTMLElement>("[data-fake-door-problem]")) {
			message.hidden = message.dataset.fakeDoorProblem !== problem;
		}
	}

	function openFor(door: HTMLButtonElement): void {
		if (!isFeature(door.dataset.fakeDoor) || dialog.open) return;
		feature = door.dataset.fakeDoor;
		opener = door;
		resetDialog();
		for (const nameEl of nameEls) nameEl.textContent = FEATURE_NAMES[feature];
		track("tp_fake_door_clicked", { feature });
		dialog.showModal();
	}

	async function subscribe(opts: { email: string; feature: FakeDoorFeature }): Promise<boolean> {
		const { email, feature } = opts;
		const signup = parseSignup({ form: `teleprompter:${feature}`, email, earlyAccess: false });
		if (!signup) {
			showProblem("email");
			return false;
		}

		showProblem(null);
		for (const button of answerButtons) button.disabled = true;
		const id = await sendSignup({ signup, honeypot: "" });
		for (const button of answerButtons) button.disabled = false;
		if (!id) showProblem("save");
		return id !== null;
	}

	async function answer(interested: boolean): Promise<void> {
		const asked = feature;
		if (!asked || answering) return;
		answering = true;

		const email = interested ? emailInput.value.trim() : "";
		const subscribed = email !== "" && (await subscribe({ email, feature: asked }));
		if (email !== "" && !subscribed) {
			answering = false;
			return;
		}

		if (!dialog.open) return;
		track("tp_fake_door_interest", { feature: asked, interested, email_provided: subscribed });
		notedEl.hidden = subscribed;
		subscribedEl.hidden = !subscribed;
		askEl.hidden = true;
		doneEl.hidden = false;
		closeButton.focus();
		if (!subscribed) confirmTimer = window.setTimeout(() => dialog.close(), CONFIRM_MS);
	}

	for (const door of doors) {
		door.addEventListener("click", () => openFor(door));
	}

	dialog.addEventListener("click", (event) => {
		const target = event.target as Element;
		const choice = target.closest<HTMLButtonElement>("[data-answer]");
		if (choice) void answer(choice.dataset.answer === "yes");
		else if (target.closest("[data-close]")) dialog.close();
	});

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
