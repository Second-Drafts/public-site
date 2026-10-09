/*
 * Which analytics providers are on. Pure, so it can be tested without a build.
 *
 *   PUBLIC_ANALYTICS_PROVIDER=gtag PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX   (comma-separate for several)
 *
 * Unset: ["console"] in dev, [] (nothing loads, nothing is sent) in production. "none" forces off.
 */

export interface AnalyticsEnv {
	DEV?: boolean;
	PUBLIC_ANALYTICS_PROVIDER?: string;
	PUBLIC_GA_MEASUREMENT_ID?: string;
}

export interface AnalyticsConfig {
	/** Provider names to activate, de-duplicated; each is a key of the registry in providers/index.ts. */
	providers: string[];
	gaMeasurementId: string;
}

/** Names that need no provider file. */
const OFF = "none";

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
			.filter((name) => name !== "" && name !== OFF);
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

/** Reads the build-time env. Static property access so the bundler can inline the values. */
export function readConfig(): AnalyticsConfig {
	return resolveProviders({
		DEV: import.meta.env.DEV,
		PUBLIC_ANALYTICS_PROVIDER: import.meta.env.PUBLIC_ANALYTICS_PROVIDER,
		PUBLIC_GA_MEASUREMENT_ID: import.meta.env.PUBLIC_GA_MEASUREMENT_ID,
	});
}
