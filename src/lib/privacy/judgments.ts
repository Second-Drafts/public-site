// Checks on registry changes that code can't decide. TypeSafe's Jev model answers the questions about wording;
// a person confirms every vendor role, and anything Jev flags or couldn't check.
// The lock trusts `purposeId`, vendor roles and the analytics schema's property kinds; these checks test that trust.
import type { Review, Snapshot } from "./lock.ts";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

// Tuned on known-good and known-bad cases: a missed problem costs more than a confirmation prompt.
export const FLAG_AT = 0.4;

const SITE =
	"A website of free writing tools, such as a teleprompter and a word counter. Visitors write or paste their own text into the tools.";

interface NoulQuestion {
	type: "noul";
	instructions: string | Record<string, string>;
	criteria: { true: string; false: string };
}

const QUESTIONS = {
	newUse: {
		type: "noul",
		instructions:
			"`previousText` and `newText` are two versions of what a website tells visitors about `describes`. Does `newText` describe using visitors' data for something `previousText` did not cover, or giving it to a company `previousText` did not name?",
		criteria: {
			true: "The new text adds a use, a recipient, or a kind of tracking, or drops a limit the previous text promised: for example a different or additional company receiving the data, linking visits across devices or websites, advertising, profiling, sharing with another company, or no longer promising to leave out what visitors write.",
			false:
				"The new text rewords, clarifies, shortens or narrows the same use by the same companies, including calling the same company by a different name.",
		},
	},
	visitorText: {
		type: "noul",
		instructions: {
			site: SITE,
			question:
				"`property` is sent to an analytics provider each time the `event` event fires. Judging by its name and `valueKinds`, could its value contain text the visitor wrote, pasted or typed, or a part of it?",
		},
		criteria: {
			true: "The value can hold some of the visitor's own words: a line, excerpt, title, file name, search term or message. A page address, URL or path counts too, because a query string can carry what the visitor typed.",
			false:
				'The value is chosen by the site from a fixed set (a setting, a source, a feature name, or a range such as a word-count bucket like "51-200"), a number, a flag, or a bare domain name.',
		},
	},
	identifiesPerson: {
		type: "noul",
		instructions: {
			site: SITE,
			question:
				"`property` is sent to an analytics provider each time the `event` event fires. Judging by its name and `valueKinds`, could its value identify a specific person?",
		},
		criteria: {
			true: "An email address, name, phone number, postal address, account or user ID, or precise location.",
			false:
				"Anything that doesn't single out a person on its own: settings, counts, durations, flags, ranges, device type, or a domain name.",
		},
	},
} as const satisfies Record<string, NoulQuestion>;

type QuestionId = keyof typeof QUESTIONS;

const CONCERNS: Record<QuestionId, string> = {
	newUse: "may describe a new use or recipient of the data, which needs re-consent",
	visitorText: "may carry text the visitor wrote",
	identifiesPerson: "may identify a person",
};

export interface Judgment {
	subject: string;
	state: Record<string, unknown>;
	questions: QuestionId[];
}

// `toCheck` is what a person must confirm before the lock records `outcome`. It's empty when Jev found nothing.
export interface ReviewItem extends Review {
	toCheck: string[];
}

const STORED_ITEM = "an item it stores on a visitor's device, as written in its cookie policy";
const CONSENT_CATEGORY = "a category of cookies, shown next to the switch visitors use to accept or refuse it";

function rewording(subject: string, describes: string, previousText: string, newText: string): Judgment {
	return { subject, state: { describes, previousText, newText }, questions: ["newUse"] };
}

function rewordedPurposes(previous: Snapshot, next: Snapshot): Judgment[] {
	const previousPurposeText = new Map(
		Object.values(previous.storage).map(({ category, purposeId, purpose }) => [`${category}/${purposeId}`, purpose]),
	);
	return Object.entries(next.storage).flatMap(([name, { category, purposeId, purpose }]) => {
		const previousPurpose = previousPurposeText.get(`${category}/${purposeId}`);
		if (previousPurpose === undefined || previousPurpose === purpose) return [];
		return [rewording(`storage ${name} (purposeId ${purposeId})`, STORED_ITEM, previousPurpose, purpose)];
	});
}

function rewordedCategoryDescriptions(previous: Snapshot, next: Snapshot): Judgment[] {
	return Object.entries(next.categories).flatMap(([id, { description }]) => {
		const previousDescription = previous.categories[id]?.description;
		if (previousDescription === undefined || previousDescription === description) return [];
		return [rewording(`category ${id} description`, CONSENT_CATEGORY, previousDescription, description)];
	});
}

type PropKinds = Record<string, string[]>;

function newOrRetypedProperties(previous: PropKinds | undefined, next: PropKinds, event: string): Judgment[] {
	return Object.entries(next).flatMap(([property, valueKinds]) => {
		if (JSON.stringify(previous?.[property]) === JSON.stringify(valueKinds)) return [];
		return [
			{
				subject: `analytics property ${event}.${property}`,
				state: { event, property, valueKinds },
				questions: ["visitorText", "identifiesPerson"],
			},
		];
	});
}

export function judgmentsFor(previous: Snapshot, next: Snapshot): Judgment[] {
	const eventProperties = Object.entries(next.analytics.events).flatMap(([event, properties]) =>
		newOrRetypedProperties(previous.analytics.events[event], properties, event),
	);
	const contextProperties = newOrRetypedProperties(previous.analytics.context, next.analytics.context, "all events");
	return [
		...rewordedCategoryDescriptions(previous, next),
		...rewordedPurposes(previous, next),
		...eventProperties,
		...contextProperties,
	];
}

// A processor label lets the lock skip re-consent, so only a person reading the vendor's terms can vouch for it.
function vendorRolesToConfirm(previous: Snapshot, next: Snapshot): ReviewItem[] {
	return Object.entries(next.vendors).flatMap(([id, { name, category, role, privacyUrl }]) => {
		const before = previous.vendors[id];
		if (before?.name === name && before.role === role && before.category === category) return [];
		return [
			{
				subject: `vendor ${id} (${name}) as ${role} in ${category}`,
				outcome: "role-confirmed",
				toCheck: [
					`Confirm ${name} acts as a ${role} under its current terms (a processor uses the data only on our instructions): ${privacyUrl}`,
				],
			},
		];
	});
}

async function judge({ subject, state, questions }: Judgment, apiKey: string): Promise<ReviewItem> {
	const response = await fetch(ENDPOINT, {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
		body: JSON.stringify({
			model: MODEL,
			state,
			questions: Object.fromEntries(questions.map((id) => [id, QUESTIONS[id]])),
		}),
	});
	if (!response.ok) throw new Error(`Jev request for ${subject} failed: ${response.status} ${await response.text()}`);
	const { answers } = (await response.json()) as { answers: Record<QuestionId, { noul: number }> };
	const concerns = questions
		.filter((id) => answers[id].noul >= FLAG_AT)
		.map((id) => `Jev: ${CONCERNS[id]} (${answers[id].noul.toFixed(2)})`);
	return { subject, outcome: concerns.length === 0 ? "clear" : "accepted", toCheck: concerns };
}

function checkByHand({ subject, questions }: Judgment): ReviewItem {
	return {
		subject,
		outcome: "checked-by-hand",
		toCheck: questions.map((id) => `Jev didn't run: check whether it ${CONCERNS[id]}`),
	};
}

export async function reviewChanges(
	previous: Snapshot,
	next: Snapshot,
	apiKey: string | undefined,
): Promise<ReviewItem[]> {
	const review = (judgment: Judgment) => (apiKey ? judge(judgment, apiKey) : checkByHand(judgment));
	const judged = await Promise.all(judgmentsFor(previous, next).map(review));
	return [...judged, ...vendorRolesToConfirm(previous, next)];
}
