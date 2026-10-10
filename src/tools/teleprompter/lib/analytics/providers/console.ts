import type { AnalyticsProvider } from "../events";

export function createConsoleProvider(): AnalyticsProvider {
	return {
		name: "console",
		track(event, props) {
			console.groupCollapsed(`[tp] ${event}`);
			console.info("[tp]", event, props);
			console.groupEnd();
		},
	};
}
