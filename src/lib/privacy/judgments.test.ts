import { describe, expect, it } from "vitest";
import { judgmentsFor } from "./judgments";
import type { Snapshot } from "./lock";

function snapshot(): Snapshot {
	return {
		analytics: {
			events: { app_opened: { source: ["string"], count: ["number"] } },
			context: { device_type: ["string"] },
		},
		categories: {},
		vendors: {},
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
		expect(judgment.state).toEqual({
			purposeId: "visitor-id",
			previousPurpose: "Tells browsers apart.",
			newPurpose: "Tells browsers apart for advertising.",
		});
		expect(Object.keys(judgment.questions)).toEqual(["newUse"]);
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
