export interface Desk {
	name: string;
	description: string;
}

export const DESKS = {
	department: {
		name: "The Department",
		description: "General information: what we're building, what's changed, and what's ahead.",
	},
	editorial: {
		name: "The Editorial Desk",
		description: "Storytelling, craft, revision, and the writing life.",
	},
	engineering: {
		name: "The Engineering Desk",
		description: "The problems we're thinking about, how the tools are made, and why.",
	},
} as const satisfies Record<string, Desk>;

export type DeskKey = keyof typeof DESKS;

export const DESK_KEYS = Object.keys(DESKS) as [DeskKey, ...DeskKey[]];

export const DEFAULT_DESK: DeskKey = "department";

/** Every desk is introduced on the About page under this anchor. */
export const deskAboutPath = (desk: DeskKey): string => `/about-us/#${desk}-desk`;

export const deskPostsPath = (desk: DeskKey): string => `/blog/desk/${desk}/`;

export interface Category {
	label: string;
	description: string;
}

export const CATEGORIES = {
	craft: {
		label: "Craft and process",
		description: "How-tos and thoughts on storytelling, writing, revising, and scripting.",
	},
	"writing-life": {
		label: "The writing life",
		description: "Reading, watching, the business of storytelling, and everything around the work.",
	},
	department: {
		label: "Building the Department",
		description: "Product updates and a look behind the scenes.",
	},
} as const satisfies Record<string, Category>;

export type CategoryKey = keyof typeof CATEGORIES;

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as [CategoryKey, ...CategoryKey[]];

export const categoryPath = (category: CategoryKey): string => `/blog/category/${category}/`;
