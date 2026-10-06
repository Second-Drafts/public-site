export const THEMES = ["light", "dark", "highlighted"] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_NAMES: Record<Theme, string> = {
	light: "Paper",
	dark: "Night shift",
	highlighted: "Highlighted",
};

export const SANDBOX_PAGES = [
	{ href: "/sandbox/tokens", label: "Tokens", description: "Colour per theme, type styles, space, radius, stroke and shadow, read from tokens.json." },
	{ href: "/sandbox/button", label: "Button", description: "Primary, accent, secondary and quiet, in three sizes, as buttons or links." },
	{ href: "/sandbox/mark", label: "Mark", description: "The five hand-drawn marker strokes over inline text." },
	{ href: "/sandbox/link", label: "Link", description: "Ink text with the green underline, and the ink underline inside the band." },
	{ href: "/sandbox/status-tag", label: "StatusTag", description: "Draft, In review, Approved, Published, Blocked." },
	{ href: "/sandbox/text-field", label: "TextField", description: "Labelled inputs and textareas, with hints and errors." },
	{ href: "/sandbox/margin-note", label: "MarginNote", description: "Comments in the margin from collaborators and agents." },
	{ href: "/sandbox/logo", label: "Logo", description: "The lockup in each theme, with its clear space." },
	{ href: "/sandbox/highlighted-band", label: "HighlightedBand", description: "The one pink band per page." },
	{ href: "/sandbox/composition", label: "Composition", description: "Everything together on one page." },
];
