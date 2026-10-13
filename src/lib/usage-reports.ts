import type { AnalyticsEvents, EventName } from "./analytics/events";

/*
 * Pages report usage through here, never by importing ./analytics directly. Analytics loads as its own module, so a
 * content blocker that refuses it costs us the reports, not the page: the tools, consent banner and cookie settings
 * keep working.
 */

type Analytics = typeof import("./analytics");

let loading: Promise<Analytics | null> | undefined;

function withAnalytics(use: (analytics: Analytics) => void): void {
	loading ??= import("./analytics").catch(() => null);
	void loading.then((analytics) => {
		if (analytics) use(analytics);
	});
}

export function startAnalytics(referrer: string): void {
	withAnalytics((analytics) => {
		analytics.initAnalytics();
		analytics.trackPageView(referrer);
	});
}

export function track<E extends EventName>(event: E, props: AnalyticsEvents[E]): void {
	withAnalytics((analytics) => analytics.track(event, props));
}
