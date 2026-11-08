export interface Desk {
	name: string;
	description: string;
}

export const DESKS = {
	department: {
		name: "The Department",
		description: "News from the Department: what we're building, what's changed, and why.",
	},
	editorial: {
		name: "The Editorial Desk",
		description: "Writing and editing: craft, revision, and the writing life.",
	},
	engineering: {
		name: "The Engineering Desk",
		description: "How the tools are made: how they work, and the design decisions behind them.",
	},
} as const satisfies Record<string, Desk>;

export type DeskKey = keyof typeof DESKS;

export const DESK_KEYS = Object.keys(DESKS) as [DeskKey, ...DeskKey[]];

export const DEFAULT_DESK: DeskKey = "department";

/** Every desk is introduced on the About page under this anchor. */
export const deskPath = (desk: DeskKey): string => `/about-us/#${desk}-desk`;

export interface Category {
	label: string;
	description: string;
}

export const CATEGORIES = {
	craft: {
		label: "Craft and process",
		description: "Evergreen how-tos on writing, revising, and scripting.",
	},
	"writing-life": {
		label: "The writing life",
		description: "Books, reading, the industry, and everything around the work.",
	},
	department: {
		label: "Building the Department",
		description: "Product updates and a look behind the scenes.",
	},
} as const satisfies Record<string, Category>;

export type CategoryKey = keyof typeof CATEGORIES;

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as [CategoryKey, ...CategoryKey[]];

export const categoryPath = (category: CategoryKey): string => `/blog/category/${category}/`;
