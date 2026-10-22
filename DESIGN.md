How seconddrafts.com applies the brand. The brand itself (voice, palette, type, logos) and the shared UI foundation (tokens, themes, type styles, states, motion, components) live in the `brand` skill from second-drafts-kit: read its `BRAND.md` and `FOUNDATION.md` first. This file only holds what is specific to this site.

This is the marketing site, so it leans into the markers more than our tools will. It uses the foundation as it is, with no overrides.

## Color

What each marker means on this site:

| Marker | Means | Use |
| --- | --- | --- |
| `marker-yellow` | **highlight** | text highlight, `selection`, search hits, the Draft tag |
| `marker-pink` | **look here** | comment threads, mentions, attention, the In-review tag |
| `marker-blue` | **go / act** | the accent button, `focus`, current location |
| `marker-green` | **link / added** | link underlines, insertions in tracked changes |
| `marker-orange` | **done** | approved, accepted, complete |
| `red-pen` | **wrong / removed** | errors, deletions, blocked |

- Don't use a marker as decoration where it would read as its meaning.
- Links are `ink` text with a `marker-green` underline (`Mark kind="underline"` or `text-decoration-color: var(--marker-green)`, 3px, offset 3px). The underline is the cue; the color is identity.
- Collaborators are assigned markers in the order yellow, pink, blue, green, orange; agents are marked with the word AGENT, not a special color.

### The Highlighted band

A page sometimes needs one band that changes the light — a closing call to action, a footer, a pull quote. Never drop the *other* page theme in for this (Night shift inside Paper reads as dark mode pasted onto a light site). Instead, the band is **highlighted**: the whole section takes the pink marker, as if someone ran a highlighter across the bottom of the page. It is the same band on both Paper and Night shift.

- Set it with `data-theme="highlighted"` on the band. Every token and component inside adapts: black ink, a deep navy `marker-blue`, darkened `-ink` colors; every text pair clears 4.5:1.
- One Highlighted band per page. It is the brand's loudest moment, not a layout pattern.
- Full-bleed and square-cornered; never a card or a rounded panel.
- **No pink inside it.** No `Mark kind="circle"`, no In-review tag, no pink collaborator nib — they vanish. Reach for `strike`, `highlight` or `check` instead; the house headline is a struck-through first draft: "Your ~~first~~ second draft starts here."
- Buttons inside are `primary` (ink). Links underline in `ink`, not green.
- Logo: `logo.svg`. Its pink circle disappears on the band — an open item: a band-specific lockup is still to be drawn.
- In Night shift the band is the brightest thing on screen; keep it to the very end of the page.
- **Back pocket:** if pink proves too much for Night shift, the alternative is the same band in `marker-yellow` (`#fbeb4b`, black ink, muted `#4a4310`, control borders `#6b6118`, focus `#1f3f73`). Not a theme yet.

## Logo

Which logo goes where, and its sizes and rules, are in `BRAND.md`. On this site:

- The header uses the wordmark: `<Logo variant="header" />`.
- Footers and anywhere the logo is the subject use the full lockup: `<Logo />`. It picks `logo-white.svg` in Night shift.
- On the Highlighted band, use `logo.svg` (see the open item above).

The logo files are in `public/img/`.

## Iconography

Not many icons will be needed for the marketing site. Make custom icons for the purposes the site needs. Common ones can come from a free set. Illustrative one-offs can be fancier, as long as they all match in style.

## Components

**Use the Astro components in `src/components/`** (`Button`, `Mark`, `StatusTag`, `TextField`, `ChoiceField`, `ScaleField`, `MarginNote`, `Link`, `HighlightedBand`, `Logo`), loaded through `DesignSystemHead.astro`. See them all at `/sandbox` in dev. They are ported from the foundation's reference components and keep the same `sd-*` class names. Per-component guidelines are in `design-system/components/<Name>/README.md`.
