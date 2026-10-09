import type { AnalyticsProvider } from "../events";

/** Dev logger: one collapsed group per event, `[tp] tp_play` with the props table inside. */
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
