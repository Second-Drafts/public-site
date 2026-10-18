// Every fact about what the site stores on a visitor's device and which third parties it contacts.
// The storage interface, consent banner, policy pages, CSP, lock file and pre-deploy scan all read from here.
// Keep this file free of imports and non-erasable TypeScript so Node scripts can load it directly.

interface Category {
	requiresConsent: boolean;
	label: string;
	description: string;
}

export const CATEGORIES = {
	necessary: {
		requiresConsent: false,
		label: "Strictly necessary",
		description:
			"Makes the tools work the way you asked them to, like keeping your work between visits. These stay on your device and are never sent to us.",
	},
	forms: {
		requiresConsent: false,
		label: "Forms",
		description:
			"Sends us what you enter in a form, like a waitlist signup, only when you submit it. Submitting is your consent.",
	},
	analytics: {
		requiresConsent: true,
		label: "Analytics",
		description:
			"Helps us understand which pages, tools and settings people use, so we know what to improve. Never includes what you write.",
	},
} as const satisfies Record<string, Category>;

export type CategoryId = keyof typeof CATEGORIES;

export type ConsentCategoryId = {
	[C in CategoryId]: (typeof CATEGORIES)[C]["requiresConsent"] extends true ? C : never;
}[CategoryId];

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export const CONSENT_CATEGORY_IDS = CATEGORY_IDS.filter(
	(id): id is ConsentCategoryId => CATEGORIES[id].requiresConsent,
);

interface Vendor {
	name: string;
	category: CategoryId;
	// Origins use CSP host-source syntax. `scripts` are where its code loads from; `data` is everywhere it sends requests.
	origins: { scripts: readonly string[]; data: readonly string[] };
	// A controller uses the data for its own purposes, so adding one to a consent category asks every visitor again.
	role: "processor" | "controller";
	transfer: string;
	privacyUrl: string;
}

export const VENDORS = {
	"github-pages": {
		name: "GitHub Pages",
		category: "necessary",
		origins: { scripts: [], data: [] },
		role: "controller",
		transfer: "EU–US Data Privacy Framework",
		privacyUrl: "https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement",
	},
	"google-analytics": {
		name: "Google Analytics",
		category: "analytics",
		origins: {
			scripts: ["https://*.googletagmanager.com"],
			data: [
				"https://*.google-analytics.com",
				"https://*.analytics.google.com",
				"https://*.googletagmanager.com",
				"https://www.google.com",
			],
		},
		role: "processor",
		transfer: "EU–US Data Privacy Framework",
		privacyUrl: "https://policies.google.com/privacy",
	},
	cloudflare: {
		name: "Cloudflare",
		category: "forms",
		origins: { scripts: [], data: ["https://forms.seconddrafts.workers.dev"] },
		role: "processor",
		transfer: "EU–US Data Privacy Framework",
		privacyUrl: "https://www.cloudflare.com/privacypolicy/",
	},
} as const satisfies Record<string, Vendor>;

export type VendorId = keyof typeof VENDORS;

export type StorageArea = "local" | "session" | "cookie";

export type Retention = "until-tab-closed" | "until-cleared" | { months: number };

interface StorageFacts {
	category: CategoryId;
	// A stable slug: rewording `purpose` keeps it, using the data for something new changes it.
	purposeId: string;
	purpose: string;
	retention: Retention;
}

interface FirstPartyStorage extends StorageFacts {
	setBy: "us";
	area: Exclude<StorageArea, "cookie">;
}

interface VendorStorage extends StorageFacts {
	setBy: VendorId;
	area: StorageArea;
}

type StorageEntry = FirstPartyStorage | VendorStorage;

// Vendor-set names may end in `*` to match any suffix. First-party names are always exact.
export const STORAGE = {
	"tp:script": {
		setBy: "us",
		area: "local",
		category: "necessary",
		purposeId: "remember-script",
		purpose: "Keeps the script you wrote in your browser, so it's still there when you come back.",
		retention: "until-cleared",
	},
	"tp:settings:v1": {
		setBy: "us",
		area: "local",
		category: "necessary",
		purposeId: "remember-display-settings",
		purpose: "Remembers how you set up the teleprompter, such as font, text size and colours.",
		retention: "until-cleared",
	},
	"wc:text": {
		setBy: "us",
		area: "local",
		category: "necessary",
		purposeId: "remember-counted-text",
		purpose: "Keeps the text you're counting in your browser, so it's still there when you come back.",
		retention: "until-cleared",
	},
	"ws:text": {
		setBy: "us",
		area: "local",
		category: "necessary",
		purposeId: "remember-sprint-draft",
		purpose: "Keeps the draft you're writing in your browser, so it's still there when you come back.",
		retention: "until-cleared",
	},
	"da:text": {
		setBy: "us",
		area: "local",
		category: "necessary",
		purposeId: "remember-analysed-draft",
		purpose: "Keeps the draft you're analysing in your browser, so it's still there when you come back.",
		retention: "until-cleared",
	},
	"wc:settings:v1": {
		setBy: "us",
		area: "local",
		category: "necessary",
		purposeId: "remember-counter-target",
		purpose: "Remembers your word counter target and format.",
		retention: "until-cleared",
	},
	"tp:hintSeen": {
		setBy: "us",
		area: "local",
		category: "necessary",
		purposeId: "remember-dismissed-hint",
		purpose: "Remembers that you've closed a tip, so it doesn't keep coming back.",
		retention: "until-cleared",
	},
	"privacy:consent": {
		setBy: "us",
		area: "local",
		category: "necessary",
		purposeId: "remember-consent-choice",
		purpose: "Remembers whether you accepted or rejected analytics, so we don't ask on every page.",
		retention: "until-cleared",
	},
	_ga: {
		setBy: "google-analytics",
		area: "cookie",
		category: "analytics",
		purposeId: "analytics-visitor-id",
		purpose: "A random ID that lets Google Analytics tell a returning browser apart from a new one.",
		retention: { months: 24 },
	},
	"_ga_*": {
		setBy: "google-analytics",
		area: "cookie",
		category: "analytics",
		purposeId: "analytics-session-state",
		purpose: "Lets Google Analytics group the pages you view into a single visit.",
		retention: { months: 24 },
	},
} as const satisfies Record<string, StorageEntry>;

export type StorageName = keyof typeof STORAGE;

export type FirstPartyKey = {
	[K in StorageName]: (typeof STORAGE)[K]["setBy"] extends "us" ? K : never;
}[StorageName];

export type RegisteredStorage = StorageEntry & { name: StorageName };

export const WILDCARD = "*";

function nameMatches(registeredName: string, actualName: string): boolean {
	if (!registeredName.endsWith(WILDCARD)) return registeredName === actualName;
	return actualName.startsWith(registeredName.slice(0, -WILDCARD.length));
}

export function findStorageEntry(area: StorageArea, actualName: string): RegisteredStorage | undefined {
	for (const [name, entry] of Object.entries(STORAGE) as [StorageName, StorageEntry][]) {
		if (entry.area === area && nameMatches(name, actualName)) return { ...entry, name };
	}
	return undefined;
}

export function describeRetention(retention: Retention): string {
	if (retention === "until-tab-closed") return "Until you close the tab";
	if (retention === "until-cleared") return "Until you clear your browser data";
	const { months } = retention;
	if (months % 12 === 0) return months === 12 ? "1 year" : `${months / 12} years`;
	return months === 1 ? "1 month" : `${months} months`;
}
