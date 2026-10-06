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

Logos are in `public/img/` (`logo.svg`, `logo-white.svg`).

For an Astro page without React, use `tokens.css` + `components/bundle.css` and write the markup with the `sd-*` classes (the structure is visible in `bundle.js`).
