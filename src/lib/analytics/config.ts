export interface AnalyticsEnv {
	DEV?: boolean;
	PUBLIC_ANALYTICS_PROVIDER?: string;
	PUBLIC_GA_MEASUREMENT_ID?: string;
}

export interface AnalyticsConfig {
	providers: string[];
	gaMeasurementId: string;
}

const EXPLICITLY_OFF = "none";

export function resolveProviders(env: AnalyticsEnv): AnalyticsConfig {
	const dev = Boolean(env.DEV);
	const gaMeasurementId = (env.PUBLIC_GA_MEASUREMENT_ID ?? "").trim();
	const raw = (env.PUBLIC_ANALYTICS_PROVIDER ?? "").trim();

	let requested: string[];
	if (raw === "") {
		requested = dev ? ["console"] : [];
	} else {
		requested = raw
			.split(",")
			.map((name) => name.trim().toLowerCase())
			.filter((name) => name !== "" && name !== EXPLICITLY_OFF);
	}

	const providers: string[] = [];
	for (const name of requested) {
		if (providers.includes(name)) continue;
		if (name === "gtag" && gaMeasurementId === "") {
			if (dev) console.warn("[tp] gtag requested but PUBLIC_GA_MEASUREMENT_ID is not set; skipping gtag.");
			continue;
		}
		providers.push(name);
	}
	return { providers, gaMeasurementId };
}

export function readConfig(): AnalyticsConfig {
	return resolveProviders({
		DEV: import.meta.env.DEV,
		PUBLIC_ANALYTICS_PROVIDER: import.meta.env.PUBLIC_ANALYTICS_PROVIDER,
		PUBLIC_GA_MEASUREMENT_ID: import.meta.env.PUBLIC_GA_MEASUREMENT_ID,
	});
}
