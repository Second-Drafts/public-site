import { afterEach, describe, expect, it, vi } from "vitest";
import { FLAG_AT, judgmentsFor, reviewChanges } from "./judgments";
import type { Snapshot } from "./lock";

function snapshot(): Snapshot {
	return {
		analytics: {
			events: { app_opened: { source: ["string"], count: ["number"] } },
			context: { device_type: ["string"] },
		},
		categories: {
			analytics: { requiresConsent: true, label: "Analytics", description: "Shows us which tools get used." },
		},
		vendors: {
			stats: {
				name: "Stats",
				category: "analytics",
				role: "processor",
				transfer: "DPF",
				privacyUrl: "https://stats.example/privacy",
				origins: { scripts: [], data: [] },
			},
		},
		storage: {
			_id: {
				setBy: "stats",
				area: "cookie",
				category: "analytics",
				purposeId: "visitor-id",
				purpose: "Tells browsers apart.",
				retention: { months: 12 },
			},
		},
	};
}

function subjectsAfter(change: (next: Snapshot) => void): string[] {
	const next = snapshot();
	change(next);
	return judgmentsFor(snapshot(), next).map(({ subject }) => subject);
}

describe("judgmentsFor", () => {
	it("asks nothing when nothing changed", () => {
		expect(subjectsAfter(() => {})).toEqual([]);
	});

	it("asks whether reworded purpose text describes a new use", () => {
		const next = snapshot();
		next.storage._id.purpose = "Tells browsers apart for advertising.";
		const [judgment] = judgmentsFor(snapshot(), next);
		expect(judgment.state).toMatchObject({
			previousText: "Tells browsers apart.",
			newText: "Tells browsers apart for advertising.",
		});
		expect(judgment.questions).toEqual(["newUse"]);
	});

	it("asks whether a reworded category description describes a new use", () => {
		const next = snapshot();
		next.categories.analytics.description = "Shows us which tools get used, and helps our partners advertise.";
		const [judgment] = judgmentsFor(snapshot(), next);
		expect(judgment.subject).toBe("category analytics description");
		expect(judgment.questions).toEqual(["newUse"]);
	});

	it("compares a replacement key with the purpose text it took over", () => {
		const subjects = subjectsAfter((next) => {
			next.storage._other_id = { ...next.storage._id, setBy: "other", purpose: "Counts returning browsers." };
			delete next.storage._id;
		});
		expect(subjects).toEqual(["storage _other_id (purposeId visitor-id)"]);
	});

	it("doesn't ask about a new purposeId, which the lock already treats as a new purpose", () => {
		expect(subjectsAfter((next) => (next.storage._id.purposeId = "ad-targeting"))).toEqual([]);
	});

	it("asks about new and retyped analytics properties only", () => {
		const subjects = subjectsAfter((next) => {
			next.analytics.events.app_opened.title = ["string"];
			next.analytics.events.app_opened.count = ["string"];
			next.analytics.events.app_closed = { reason: ["string"] };
			next.analytics.context.locale = ["string"];
		});
		expect(subjects).toEqual([
			"analytics property app_opened.count",
			"analytics property app_opened.title",
			"analytics property app_closed.reason",
			"analytics property all events.locale",
		]);
	});
});

function reviewsAfter(change: (next: Snapshot) => void, apiKey?: string) {
	const next = snapshot();
	change(next);
	return reviewChanges(snapshot(), next, apiKey);
}

function answerEvery(question: string, noul: number): void {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => Response.json({ answers: { [question]: { noul } } })),
	);
}

describe("reviewChanges", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const rewordPurpose = (next: Snapshot) => (next.storage._id.purpose = "Tells returning browsers apart.");

	it("records clear when Jev finds nothing", async () => {
		answerEvery("newUse", FLAG_AT - 0.01);
		const [review] = await reviewsAfter(rewordPurpose, "key");
		expect(review).toMatchObject({ outcome: "clear", toCheck: [] });
	});

	it("asks a person to accept what Jev flags", async () => {
		answerEvery("newUse", FLAG_AT);
		const [review] = await reviewsAfter(rewordPurpose, "key");
		expect(review.outcome).toBe("accepted");
		expect(review.toCheck).toHaveLength(1);
	});

	it("asks a person to check by hand without an API key", async () => {
		const [review] = await reviewsAfter(rewordPurpose);
		expect(review.outcome).toBe("checked-by-hand");
		expect(review.toCheck).toHaveLength(1);
	});

	it("asks a person to confirm the role of a new or relabeled vendor", async () => {
		const added = await reviewsAfter((next) => (next.vendors.other = { ...next.vendors.stats, name: "Other" }));
		const relabeled = await reviewsAfter((next) => (next.vendors.stats.role = "controller"));
		const moved = await reviewsAfter((next) => (next.vendors.stats.category = "necessary"));
		for (const [review] of [added, relabeled, moved]) {
			expect(review.outcome).toBe("role-confirmed");
			expect(review.toCheck.join()).toContain("https://stats.example/privacy");
		}
		expect(added[0].subject).toBe("vendor other (Other) as processor in analytics");
	});

	it("doesn't ask about a vendor whose name, role and category are unchanged", async () => {
		expect(await reviewsAfter((next) => next.vendors.stats.origins.data.push("https://more.example"))).toEqual([]);
	});
});
