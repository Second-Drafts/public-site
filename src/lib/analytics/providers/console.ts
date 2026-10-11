import type { AnalyticsProvider } from "../events";

export function createConsoleProvider(): AnalyticsProvider {
	return {
		name: "console",
		vendor: null,
		track(event, props) {
			console.groupCollapsed(`[analytics] ${event}`);
			console.info("[analytics]", event, props);
			console.groupEnd();
		},
	};
}
