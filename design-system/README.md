# Design system files

The rules live in [`../DESIGN.md`](../DESIGN.md). This folder holds the files that implement them, copied from the design-system artifact on claude.ai (the source of truth until the system moves fully into this repo).

| File | What it is |
| --- | --- |
| `tokens.json` | Every token, per theme (`light` = Paper, `dark` = Night shift, `highlighted` = the pink band). Source for everything else. |
| `tokens.css` | The tokens as CSS custom properties, one block per `[data-theme]`, plus `.sd-text-*` type-style classes. Generated from `tokens.json` — edit the JSON, then regenerate. |
| `components/bundle.css` | Styles for the components (`.sd-*` classes). Also `@import`s the Google Fonts. Load after `tokens.css`. |
| `components/bundle.js` | React 18 components on `window.SecondDrafts`: Button, Mark, StatusTag, TextField, MarginNote. Needs `window.React` / `window.ReactDOM`. |
| `components/index.d.ts` | Prop types, as documentation. |
| `components/<Name>/README.md` | Usage guidelines per component. |
| `fonts/` | `JosefinSans-Regular.ttf`. Literata and IBM Plex Mono load from Google Fonts for now. |

Logos are in `public/img/`: the lockup (`logo.svg`, `logo-white.svg`) and the header wordmark (`sd-word-single_line-marked.svg`, `sd-word-single_line-marked-night.svg`).

## In this site

The site uses Astro components, not the React bundle. They are ported from `bundle.css` / `bundle.js` and keep the same `sd-*` class names, so the two can be compared:

- `src/components/` — `Button`, `Mark`, `StatusTag`, `TextField`, `MarginNote`, plus `Link`, `HighlightedBand` and `Logo` from DESIGN.md. Each one has its own scoped styles.
- `src/components/DesignSystemHead.astro` — put it in a layout's `<head>`. It loads `src/styles/design-system.css` (which imports `tokens.css` here) and the Google Fonts.
- `/sandbox` (dev only) shows every component in every theme.

When a new export comes in from Claude Design, replace the files in this folder, then copy any CSS or markup changes into the matching component by hand.
