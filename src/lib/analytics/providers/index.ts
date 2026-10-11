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
