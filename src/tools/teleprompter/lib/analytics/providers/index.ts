/*
 * Provider registry. To add a provider (Plausible, PostHog, ...):
 *   1. Create providers/<name>.ts exporting a factory that returns an AnalyticsProvider
 *      ({ name, init?(), track(event, props) }); init() is where you inject the vendor script.
 *   2. Add one line to REGISTRY below.
 *   3. Turn it on with PUBLIC_ANALYTICS_PROVIDER=<name> (comma-separated for several).
 * Props arrive already sanitized (primitives only) and include session_id and device_type.
 */
import type { AnalyticsProvider } from "../events";
import { createConsoleProvider } from "./console";
import { createGtagProvider } from "./gtag";

export interface ProviderOptions {
	gaMeasurementId: string;
}

export const REGISTRY: Record<string, (options: ProviderOptions) => AnalyticsProvider> = {
	console: () => createConsoleProvider(),
	gtag: ({ gaMeasurementId }) => createGtagProvider(gaMeasurementId),
};
