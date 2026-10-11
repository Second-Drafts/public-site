import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeCookieJar, fakeWebStorage } from "./test-fakes";

const analyticsStub = {
	"tp:sessionProbe": {
		setBy: "us",
		area: "session",
		category: "analytics",
		purposeId: "session-probe",
		purpose: "test",
		retention: "until-tab-closed",
	},
	"tp:analyticsProbe": {
		setBy: "us",
		area: "local",
		category: "analytics",
		purposeId: "probe",
		purpose: "test",
		retention: "until-cleared",
	},
};

async function loadStorage({ analyticsGranted = false } = {}) {
	vi.resetModules();
	vi.doMock("./consent", () => ({
		consent: { get: (category: string) => category === "necessary" || analyticsGranted },
	}));
	vi.doMock("./registry", async () => {
		const actual = await vi.importActual<typeof import("./registry")>("./registry");
		const findStorageEntry: typeof actual.findStorageEntry = (area, name) => {
			const stub = analyticsStub[name as keyof typeof analyticsStub];
			if (stub?.area === area) return { ...stub, name } as never;
			return actual.findStorageEntry(area, name);
		};
		return { ...actual, STORAGE: { ...actual.STORAGE, ...analyticsStub }, findStorageEntry };
	});
	return import("./storage");
}

let local: Storage;
let session: Storage;

beforeEach(() => {
	local = fakeWebStorage();
	session = fakeWebStorage();
	vi.stubGlobal("localStorage", local);
	vi.stubGlobal("sessionStorage", session);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.unstubAllEnvs();
	vi.doUnmock("./consent");
	vi.doUnmock("./registry");
});

describe("necessary keys", () => {
	it("read, write and remove without consent", async () => {
		const { stored } = await loadStorage();
		const script = stored("tp:script");
		script.write("hello");
		expect(local.getItem("tp:script")).toBe("hello");
		expect(script.read()).toBe("hello");
		script.remove();
		expect(script.read()).toBeNull();
	});

	it("round-trips JSON and returns undefined for missing or invalid data", async () => {
		const { stored } = await loadStorage();
		const settings = stored("tp:settings:v1");
		expect(settings.readJSON()).toBeUndefined();
		settings.writeJSON({ fontSize: 4 });
		expect(settings.readJSON()).toEqual({ fontSize: 4 });
		local.setItem("tp:settings:v1", "{broken");
		expect(settings.readJSON()).toBeUndefined();
	});

	it("swallows errors when storage is blocked", async () => {
		const { stored } = await loadStorage();
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: () => {
				throw new Error("blocked");
			},
			removeItem: () => {
				throw new Error("blocked");
			},
		});
		const script = stored("tp:script");
		expect(script.read()).toBeNull();
		expect(() => script.write("x")).not.toThrow();
		expect(() => script.remove()).not.toThrow();
	});
});

describe("analytics keys", () => {
	it("do nothing without consent", async () => {
		vi.stubEnv("DEV", false);
		const { stored } = await loadStorage({ analyticsGranted: false });
		const probe = stored("tp:analyticsProbe" as never);
		probe.write("1");
		expect(local.getItem("tp:analyticsProbe")).toBeNull();
		expect(probe.read()).toBeNull();
	});

	it("throw in dev naming the key and category without consent", async () => {
		const { stored } = await loadStorage({ analyticsGranted: false });
		const probe = stored("tp:analyticsProbe" as never);
		expect(() => probe.write("1")).toThrow("tp:analyticsProbe (analytics)");
		expect(() => probe.read()).toThrow("tp:analyticsProbe (analytics)");
	});

	it("work once consent is granted", async () => {
		const { stored } = await loadStorage({ analyticsGranted: true });
		const probe = stored("tp:analyticsProbe" as never);
		probe.write("1");
		expect(probe.read()).toBe("1");
	});
});

describe("purgeCategory", () => {
	it("removes analytics entries from every area and leaves necessary ones", async () => {
		await loadStorage({ analyticsGranted: true });
		const { purgeCategory } = await import("./raw-storage");
		local.setItem("tp:analyticsProbe", "1");
		local.setItem("tp:script", "keep me");
		session.setItem("tp:sessionProbe", "1");
		const jar = fakeCookieJar([
			{ name: "_ga", value: "a" },
			{ name: "_ga_ABC123", value: "b", domain: ".seconddrafts.com" },
			{ name: "unrelated", value: "c" },
		]);
		vi.stubGlobal("document", jar);

		purgeCategory("analytics");

		expect(local.getItem("tp:analyticsProbe")).toBeNull();
		expect(session.getItem("tp:sessionProbe")).toBeNull();
		expect(local.getItem("tp:script")).toBe("keep me");
		expect(jar.cookie).toBe("unrelated=c");
	});
});
