import { afterEach, describe, expect, it, vi } from "vitest";
import { removeRetiredStorage } from "./retired-storage";

function fakeArea(initial: Record<string, string>) {
	const items = new Map(Object.entries(initial));
	return {
		items,
		area: { removeItem: (key: string) => void items.delete(key) },
	};
}

afterEach(() => vi.unstubAllGlobals());

describe("removeRetiredStorage", () => {
	it("removes the keys earlier versions left behind and keeps everything else", () => {
		const local = fakeArea({ "tp:lastVisit": "1", "tp:script": "hello" });
		const session = fakeArea({ "tp:sessionId": "abc", "tp:visitRecorded": "1", other: "x" });
		vi.stubGlobal("localStorage", local.area);
		vi.stubGlobal("sessionStorage", session.area);

		removeRetiredStorage();

		expect([...local.items.keys()]).toEqual(["tp:script"]);
		expect([...session.items.keys()]).toEqual(["other"]);
	});

	it("does nothing when storage is blocked", () => {
		const blocked = () => {
			throw new DOMException("denied", "SecurityError");
		};
		vi.stubGlobal("localStorage", undefined);
		Object.defineProperty(globalThis, "localStorage", { get: blocked, configurable: true });
		Object.defineProperty(globalThis, "sessionStorage", { get: blocked, configurable: true });

		expect(() => removeRetiredStorage()).not.toThrow();
	});
});
