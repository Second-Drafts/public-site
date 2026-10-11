import { afterEach, describe, expect, it, vi } from "vitest";
import { createGtagProvider } from "./gtag";

function stubBrowser(location: { origin: string; pathname: string; hash: string }) {
	const appended: { src: string }[] = [];
	const window: { dataLayer?: unknown[]; gtag?: unknown } = {};
	vi.stubGlobal("window", window);
	vi.stubGlobal("location", location);
	vi.stubGlobal("document", {
		createElement: () => ({ src: "" }),
		head: { appendChild: (script: { src: string }) => appended.push(script) },
	});
	return { window, appended };
}

afterEach(() => vi.unstubAllGlobals());

describe("gtag provider", () => {
	it("configures GA without the URL fragment, Signals or ad personalization", () => {
		const { window, appended } = stubBrowser({
			origin: "https://seconddrafts.com",
			pathname: "/tools/teleprompter/",
			hash: "#s=secret-script",
		});
		createGtagProvider("G-TEST").init?.();

		const config = (window.dataLayer as ArrayLike<unknown>[])
			.map((entry) => Array.from(entry))
			.find(([kind]) => kind === "config");
		expect(config).toEqual([
			"config",
			"G-TEST",
			{
				send_page_view: false,
				page_location: "https://seconddrafts.com/tools/teleprompter/",
				allow_google_signals: false,
				allow_ad_personalization_signals: false,
			},
		]);
		expect(appended[0].src).toBe("https://www.googletagmanager.com/gtag/js?id=G-TEST");
	});
});
