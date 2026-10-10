import type { AnalyticsProvider } from "../events";

declare global {
	interface Window {
		dataLayer?: unknown[];
		gtag?: (...args: unknown[]) => void;
	}
}

export function createGtagProvider(measurementId: string): AnalyticsProvider {
	return {
		name: "gtag",
		init() {
			if (typeof window === "undefined" || typeof document === "undefined") return;
			window.dataLayer = window.dataLayer || [];
			if (!window.gtag) {
				// GA requires the `arguments` object itself on the dataLayer, not an array of the args.
				window.gtag = function gtag() {
					// eslint-disable-next-line prefer-rest-params
					window.dataLayer!.push(arguments);
				};
			}
			const script = document.createElement("script");
			script.async = true;
			script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
			document.head.appendChild(script);
			window.gtag("js", new Date());
			window.gtag("config", measurementId, { send_page_view: false });
		},
		track(event, props) {
			window.gtag?.("event", event, props);
		},
	};
}
