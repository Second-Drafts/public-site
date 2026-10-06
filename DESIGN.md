The Department of Second Drafts makes the creative workstation for storytellers — novelists, academics, scriptwriters, newsletter writers, and formats that don't exist yet. The identity is one idea, taken from the logo: **clean black type is the work; bright marker is the revision.** Type carries meaning. Marker carries attention, direction and approval. Every surface should look like a good page that someone has started to improve.

## Principles

- **The page comes first.** `paper` and `ink` do almost all the work. Marker colours are annotations on top, never backgrounds for whole regions — with one deliberate exception, the Highlighted band (below).
- **Every marker means one thing.** Five markers, five jobs (below). Don't use one for decoration where it would read as its meaning.
- **Rough over slick.** Marker strokes are hand-drawn and slightly off-axis. UI chrome is crisp. The contrast between the two is the brand — don't make the chrome hand-drawn, and don't make the markers geometric.
- **For every kind of storyteller.** Nothing in the UI or copy should assume fiction, academia or video. Say "story", "draft", "piece", "collaborator".

## Voice and copy

- We are "we"; the writer is "you". Address the writer directly and plainly: "Your draft is saved." not "Draft successfully saved!"
- The Department is a gentle bureaucratic joke. Use it sparingly, in empty states and confirmations — "Filed.", "Stamped and sent to your editor.", "Nothing in your in-tray." — never in errors, and never at the writer's expense.
- Sentence case everywhere in UI (buttons, menus, titles). Uppercase only in the `label` and `display` styles, and in `headline` when it isn't bold.
- Respect the work. Never call writing "content". Never promise that a tool writes for you; agents *assist*, *suggest*, *check*. Credit the writer.
- No emoji. No exclamation marks in product UI.
- Numbers about writing are concrete and set in `meta`: "82,310 words", "v14", "edited 2m ago".

Examples:

| Instead of | Write |
| --- | --- |
| Generate chapter | Draft a scene with Agent |
| Content saved successfully! | Saved. v15 is filed. |
| Error: invalid input | That title is already in this project. Try another. |
| No documents found | Nothing in your in-tray yet. Start a draft. |

## Colour

The logo has six colours: black ink and five markers. They map to the product like this:

| Marker | Logo gesture | Means | Use |
| --- | --- | --- | --- |
| `marker-yellow` | highlighter scribble | **highlight** | text highlight, `selection`, search hits, the Draft tag |
| `marker-pink` | circle | **look here** | comment threads, mentions, attention, the In-review tag |
| `marker-blue` | arrow | **go / act** | the accent button, `focus`, current location |
| `marker-green` | underline | **link / added** | link underlines, insertions in tracked changes |
| `marker-orange` | check mark | **done** | approved, accepted, complete |
| `red-pen` | (the editor's pen) | **wrong / removed** | errors, deletions, blocked |

Rules:

- Grounds are `paper`, `paper-raised`, `paper-sunken`. Text is `ink` or `ink-muted` on any of them.
- Markers are **fills and strokes, not text**. Text on a marker fill is `on-marker` (black in both themes); on a `marker-blue` fill it is `on-blue` (white in Paper, dark in Night shift). When a marker colour must be text or an icon, use its `-ink` token (`blue-ink`, `green-ink`, `pink-ink`, `orange-ink`), each ≥4.5:1 on paper in both themes.
- Links are `ink` text with a `marker-green` underline (`Mark kind="underline"` or `text-decoration-color: var(--marker-green)`, 3px, offset 3px). The underline is the cue; the colour is identity.
- Never let colour alone carry status: every status has a word, a strike or a check. Success (orange check) and error (red pen) also differ strongly in lightness.
- Collaborators are assigned markers in the order yellow, pink, blue, green, orange; agents are marked with the word AGENT, not a special colour.
- Marker strokes (`Mark`) are decoration over text that already says the thing — pink and yellow strokes are under 3:1 on paper by design and never stand alone.
- No gradients. One shadow, `shadow-lift`, for floating surfaces only.

Both themes — **Paper** (`light`) and **Night shift** (`dark`) — keep yellow, pink, green and orange at the logo's values; paper, ink, rules and the `-ink` variants change. `marker-blue` is the exception because it is the action colour and must read as text and as a focus ring: `#306abb` in Paper (a shade deeper than the logo's `#346fc2`) and `#5b8fdb` in Night shift, ≥4.7:1 on every paper ground. The logo file keeps its own blue.

### The Highlighted band

A page sometimes needs one band that changes the light — a closing call to action, a footer, a pull quote. Never drop the *other* page theme in for this (Night shift inside Paper reads as dark mode pasted onto a light site). Instead, the band is **highlighted**: the whole section takes the pink marker, as if someone ran a highlighter across the bottom of the page. It is the same band on both Paper and Night shift.

- Set it with `data-theme="highlighted"` on the band. Every token and component inside adapts: black ink, a deep navy `marker-blue`, darkened `-ink` colours; every text pair clears 4.5:1.
- One Highlighted band per page. It is the brand's loudest moment, not a layout pattern.
- Full-bleed and square-cornered; never a card or a rounded panel.
- **No pink inside it.** No `Mark kind="circle"`, no In-review tag, no pink collaborator nib — they vanish. Reach for `strike`, `highlight` or `check` instead; the house headline is a struck-through first draft: "Your ~~first~~ second draft starts here."
- Buttons inside are `primary` (ink). Links underline in `ink`, not green.
- Logo: `logo.svg`. Its pink circle disappears on the band — an open item: a band-specific lockup is still to be drawn.
- In Night shift the band is the brightest thing on screen; keep it to the very end of the page.
- **Back pocket:** if pink proves too much for Night shift, the alternative is the same band in `marker-yellow` (`#fbeb4b`, black ink, muted `#4a4310`, control borders `#6b6118`, focus `#1f3f73`). Not a theme yet.

## Type

- **Josefin Sans** (`display`) is the logo's face: geometric, a little vintage, sits high in its line box. Use it for `display`, `headline`, `title`, `heading`, `button` and `label` only.
- **Caps or bold, never both.** Josefin in all caps already shouts; adding weight is overkill. `display` is always uppercase, as the logo sets DEPARTMENT and SECOND DRAFTS, so it is always Light (300) or Regular (400). `headline` may go either way: uppercase at Light/Regular, or sentence case at up to Semibold (600). From `title` down, sentence case, and Semibold is fine. Need emphasis in a caps line? Use a `Mark`, not weight.
- **Caps must be short.** All caps is hard to read, so it is only for a few words: a `label` is at most 3 words; a `display` line or a caps `headline` at most 6 words and 2 lines. More than that? Write it in sentence case at `headline` or `title` instead.
- Because the face rides high, give Josefin text in a fixed-height box 2px more top padding than bottom (buttons: `10px 16px 8px`).
- **Literata** (`prose`) is the writing face — designed for long reading on screen. All body copy, the editor, inputs and margin notes use `prose`, `prose-sm` or `prose-lg`; `quote` for epigraphs.
- **IBM Plex Mono** (`mono`) is for facts about the writing: `meta` for versions, word counts, timestamps and agent names; `code` for template variables.
- All three are Google Fonts. Load them with: `https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300..700&family=Literata:ital,opsz,wght@0,7..72,400..700;1,7..72,400..700&family=IBM+Plex+Mono:wght@400;500&display=swap` (`design-system/components/bundle.css` already imports it). Josefin Sans is also in `design-system/fonts/`.
- Manuscript measure: 60–72 characters (`max-width: 34em` at `prose`).

## Space, shape, line

- Spacing is a 4px base: `space-1` … `space-16`. Fields stack `space-6` apart; sections `space-12`; the manuscript column has at least `space-16` of margin on desktop.
- Corners are small: `radius-sm` inputs, `radius-md` buttons and cards, `radius-lg` dialogs. `radius-pill` is reserved for tags and collaborator swatches — the marker's round nib.
- Lines come in three weights: `stroke-hairline` for rules and borders, `stroke-pen` for focus rings and red-pen strikes, `stroke-marker` for annotations.
- Borders, not shadows, separate surfaces. A card is `paper-raised` with a `rule` hairline.

## States

- **Focus:** `stroke-pen` solid `focus` ring with a 2px `paper` gap (`box-shadow: 0 0 0 2px var(--paper), 0 0 0 4px var(--focus)`). Always visible on keyboard focus.
- **Hover:** ink fills darken under a 14% black overlay; blue fills take a 14% `ink` overlay (darker in Paper, lighter in Night shift) so `on-blue` text keeps its contrast; secondary buttons drop to `paper-sunken`; quiet buttons gain a `marker-yellow` highlight.
- **Disabled:** 40% opacity, no pointer. Never grey out with a new colour.
- **Error:** `red-pen` border and message text, plus the word saying what's wrong.

## Motion

Markers draw on: a stroke animates its dash from 0 to full over 240ms ease-out, once, when an annotation first appears. Nothing else moves except opacity fades (120ms). Respect `prefers-reduced-motion`: no draw-on, show the finished stroke.

## Logo

- `logo.svg` on Paper and on the Highlighted band. `logo-white.svg` (ink lightened, markers unchanged) on Night shift.
- Minimum width 160px. Clear space all round equal to the height of the "D" in DEPARTMENT.
- Never recolour the markers, re-letter the name, or animate the logo's strokes.

## Iconography

Not many icons will be needed for the marketing site. It should probably make icons for custom for the purposes that it needs. If they're for common use cases it can bring in something free. If it's a more illustrative usage we can create a fancier one-off as long as the one-offs all match in style.

## Components

**In this repo, use the Astro components in `src/components/`** (`Button`, `Mark`, `StatusTag`, `TextField`, `MarginNote`, `Link`, `HighlightedBand`, `Logo`), loaded through `DesignSystemHead.astro`. See them all at `/sandbox` in dev. The React bundle below is the Claude Design reference.

`window.SecondDrafts` exposes `Button`, `Mark`, `StatusTag`, `TextField` and `MarginNote` (React 18). Load `design-system/tokens.css`, `design-system/components/bundle.css`, React, then `design-system/components/bundle.js`. Per-component guidelines are in `design-system/components/<Name>/README.md`; token values in `design-system/tokens.json`. Logos are in `public/img/`. Prefix your own classes something other than `sd-`.
