import { describe, expect, it } from "vitest";
import lock from "./registry.lock.json";
import {
	bumpVersion,
	buildSnapshot,
	compareRetention,
	diffSnapshots,
	maxBump,
	requiredBump,
	snapshotOf,
	type Snapshot,
} from "./lock";
import { EVENT_SCHEMA, SESSION_CONTEXT_SCHEMA } from "../../tools/teleprompter/lib/analytics/events";

function baseSnapshot(): Snapshot {
	return {
		analytics: {
			events: { app_opened: { source: ["string"], count: ["number"] } },
			context: { device_type: ["string"] },
		},
		categories: {
			necessary: { requiresConsent: false, label: "Necessary", description: "d" },
			analytics: { requiresConsent: true, label: "Analytics", description: "d" },
		},
		vendors: {
			host: {
				name: "Host",
				category: "necessary",
				role: "controller",
				transfer: "DPF",
				privacyUrl: "https://host.example/privacy",
				origins: { scripts: [], data: [] },
			},
			stats: {
				name: "Stats",
				category: "analytics",
				role: "processor",
				transfer: "DPF",
				privacyUrl: "https://stats.example/privacy",
				origins: { scripts: ["https://stats.example"], data: ["https://stats.example"] },
			},
		},
		storage: {
			"app:prefs": {
				setBy: "us",
				area: "local",
				category: "necessary",
				purposeId: "remember-prefs",
				purpose: "Remembers preferences.",
				retention: "until-cleared",
			},
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

function bumpFor(change: (snapshot: Snapshot) => void): string {
	const next = baseSnapshot();
	change(next);
	return requiredBump(diffSnapshots(baseSnapshot(), next));
}

function snapshotOfRegistry() {
	return buildSnapshot({ events: EVENT_SCHEMA, context: SESSION_CONTEXT_SCHEMA });
}

describe("registry lock", () => {
	it("matches the registry", () => {
		const message =
			"The registry disagrees with registry.lock.json. Run `npm run privacy:lock` and review the cookie policy.";
		expect(snapshotOfRegistry(), message).toEqual(snapshotOf(lock as Snapshot));
	});

	it("leaves out internal-only fields", () => {
		const entry = Object.values(snapshotOfRegistry().storage)[0];
		expect(entry).not.toHaveProperty("owner");
	});
});

describe("bump rules", () => {
	it("is a patch when nothing disclosed changed", () => {
		expect(bumpFor(() => {})).toBe("patch");
	});

	describe("major, in a consent-requiring category", () => {
		it("for a new vendor", () => {
			expect(bumpFor((s) => (s.vendors.other = { ...s.vendors.stats, name: "Other" }))).toBe("major");
		});

		it("for a new purposeId", () => {
			expect(bumpFor((s) => (s.storage._id.purposeId = "ad-targeting"))).toBe("major");
		});

		it("for a key moved into the category", () => {
			expect(bumpFor((s) => (s.storage["app:prefs"].category = "analytics"))).toBe("major");
		});

		it("for a new key", () => {
			expect(bumpFor((s) => (s.storage._new = { ...s.storage._id, purposeId: "another-purpose" }))).toBe("major");
		});

		it("for longer retention", () => {
			expect(bumpFor((s) => (s.storage._id.retention = { months: 24 }))).toBe("major");
			expect(bumpFor((s) => (s.storage._id.retention = "until-cleared"))).toBe("major");
		});
	});

	describe("minor", () => {
		it("for a necessary key added or removed", () => {
			expect(bumpFor((s) => (s.storage["app:new"] = { ...s.storage["app:prefs"], purposeId: "new-one" }))).toBe(
				"minor",
			);
			expect(bumpFor((s) => delete s.storage["app:prefs"])).toBe("minor");
		});

		it("for a new necessary vendor", () => {
			expect(bumpFor((s) => (s.vendors.cdn = { ...s.vendors.host, name: "CDN" }))).toBe("minor");
		});

		it("for reworded purpose", () => {
			expect(bumpFor((s) => (s.storage._id.purpose = "Reworded."))).toBe("minor");
		});

		it("for shorter retention", () => {
			expect(bumpFor((s) => (s.storage._id.retention = { months: 6 }))).toBe("minor");
			expect(bumpFor((s) => (s.storage._id.retention = "until-tab-closed"))).toBe("minor");
		});

		it("for changed origins", () => {
			expect(bumpFor((s) => s.vendors.stats.origins.data.push("https://more.example"))).toBe("minor");
		});

		it("for a removed consent-category key", () => {
			expect(bumpFor((s) => delete s.storage._id)).toBe("minor");
		});
	});

	describe("minor, for analytics disclosures", () => {
		it("for a new event", () => {
			expect(bumpFor((s) => (s.analytics.events.app_closed = {}))).toBe("minor");
		});

		it("for a new property", () => {
			expect(bumpFor((s) => (s.analytics.events.app_opened.locale = ["string"]))).toBe("minor");
		});

		it("for a removed property", () => {
			expect(bumpFor((s) => delete s.analytics.events.app_opened.count)).toBe("minor");
		});

		it("for a changed kind", () => {
			expect(bumpFor((s) => (s.analytics.events.app_opened.count = ["string"]))).toBe("minor");
		});

		it("for a new session context property", () => {
			expect(bumpFor((s) => (s.analytics.context.locale = ["string"]))).toBe("minor");
		});
	});

	it("picks the largest bump for a combination", () => {
		const bump = bumpFor((s) => {
			s.storage._id.purpose = "Reworded.";
			s.storage._id.retention = { months: 24 };
			delete s.storage["app:prefs"];
		});
		expect(bump).toBe("major");
	});
});

describe("compareRetention", () => {
	it("orders tab-closed < months < until-cleared", () => {
		expect(compareRetention("until-tab-closed", { months: 1 })).toBeLessThan(0);
		expect(compareRetention({ months: 24 }, { months: 12 })).toBeGreaterThan(0);
		expect(compareRetention({ months: 12 }, { months: 12 })).toBe(0);
		expect(compareRetention({ months: 999 }, "until-cleared")).toBeLessThan(0);
	});
});

describe("versions", () => {
	it("bumps and resets lower parts", () => {
		expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4");
		expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
		expect(bumpVersion("1.2.3", "major")).toBe("2.0.0");
	});

	it("never lowers a bump", () => {
		expect(maxBump("major", "patch")).toBe("major");
		expect(maxBump("patch", "minor")).toBe("minor");
		expect(maxBump("minor", "minor")).toBe("minor");
	});
});
