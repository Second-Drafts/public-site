/// <reference types="astro/client" />

interface ImportMetaEnv {
	/** Comma-separated analytics providers: "console", "gtag", "none". Unset: console in dev, nothing in production. */
	readonly PUBLIC_ANALYTICS_PROVIDER?: string;
	/** GA4 measurement ID (G-XXXXXXXXXX), required when the gtag provider is on. */
	readonly PUBLIC_GA_MEASUREMENT_ID?: string;
	/** Origin of the forms Worker (workers/forms). Unset: forms can't save and show their error. */
	readonly PUBLIC_FORMS_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
