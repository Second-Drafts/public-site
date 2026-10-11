// Semantic checks on registry changes that code can't decide, answered by TypeSafe's Jev model.
// The lock trusts `purposeId` and the analytics schema's property kinds; these questions check that trust.
import type { Snapshot } from "./lock.ts";

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

export interface Judgment {
	subject: string;
	state: Record<string, unknown>;
	questions: Record<string, NoulQuestion>;
}

export interface Concern {
	subject: string;
	question: string;
	probability: number;
}

const QUESTIONS = {
	newUse: {
		type: "noul",
		instructions:
			"`previousPurpose` and `newPurpose` describe the same item a website stores on a visitor's device, as written in its cookie policy. Does `newPurpose` describe using the data for something `previousPurpose` did not cover?",
		criteria: {
			true: "The new text adds a use, a recipient, or a kind of tracking: for example linking visits across devices or websites, advertising, profiling, or sharing with another company.",
			false: "The new text rewords, clarifies, shortens or narrows the same use, or names the provider differently.",
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

const QUESTION_DESCRIPTIONS: Record<keyof typeof QUESTIONS, string> = {
	newUse: "describes a new use of the data, which needs a new purposeId and re-consent",
	visitorText: "could carry text the visitor wrote",
	identifiesPerson: "could identify a person",
};

function rewordedPurposes(previous: Snapshot, next: Snapshot): Judgment[] {
	const previousPurposeText = new Map(
		Object.values(previous.storage).map(({ category, purposeId, purpose }) => [`${category}/${purposeId}`, purpose]),
	);
	return Object.entries(next.storage).flatMap(([name, { category, purposeId, purpose }]) => {
		const previousPurpose = previousPurposeText.get(`${category}/${purposeId}`);
		if (previousPurpose === undefined || previousPurpose === purpose) return [];
		return [
			{
				subject: `storage ${name} (purposeId ${purposeId})`,
				state: { purposeId, previousPurpose, newPurpose: purpose },
				questions: { newUse: QUESTIONS.newUse },
			},
		];
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
				questions: { visitorText: QUESTIONS.visitorText, identifiesPerson: QUESTIONS.identifiesPerson },
			},
		];
	});
}

export function judgmentsFor(previous: Snapshot, next: Snapshot): Judgment[] {
	const eventProperties = Object.entries(next.analytics.events).flatMap(([event, properties]) =>
		newOrRetypedProperties(previous.analytics.events[event], properties, event),
	);
	const contextProperties = newOrRetypedProperties(previous.analytics.context, next.analytics.context, "all events");
	return [...rewordedPurposes(previous, next), ...eventProperties, ...contextProperties];
}

async function judge({ subject, state, questions }: Judgment, apiKey: string): Promise<Concern[]> {
	const response = await fetch(ENDPOINT, {
		method: "POST",
		headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
		body: JSON.stringify({ model: MODEL, state, questions }),
	});
	if (!response.ok) throw new Error(`Jev request for ${subject} failed: ${response.status} ${await response.text()}`);
	const { answers } = (await response.json()) as { answers: Record<string, { noul: number }> };
	return Object.entries(answers).map(([id, { noul }]) => ({
		subject,
		question: QUESTION_DESCRIPTIONS[id as keyof typeof QUESTIONS],
		probability: noul,
	}));
}

export async function concernsAbout(judgments: Judgment[], apiKey: string): Promise<Concern[]> {
	const answers = await Promise.all(judgments.map((judgment) => judge(judgment, apiKey)));
	return answers.flat().filter(({ probability }) => probability >= FLAG_AT);
}
