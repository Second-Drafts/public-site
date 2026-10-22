# Design system files

This folder is the site's copy of the brand's UI foundation. The source is the `brand` plugin in [second-drafts-kit](https://github.com/Second-Drafts/second-drafts-kit) (`plugins/brand/skills/brand/assets/foundation/`), where `FOUNDATION.md` holds the rules. What's specific to this site is in [`../DESIGN.md`](../DESIGN.md).

The site owns this copy, so changes in the kit never reach it on their own. Bring them in deliberately: compare with `diff -r <kit>/plugins/brand/skills/brand/assets/foundation design-system`, copy what you want, and update the matching Astro components by hand. A change that should reach every product goes into the kit first.

| File | What it is |
| --- | --- |
| `tokens.json` | Every token, per theme (`light` = Paper, `dark` = Night shift, `highlighted` = the pink band). Source for everything else. |
| `tokens.css` | The tokens as CSS custom properties, one block per `[data-theme]`, plus `.sd-text-*` type-style classes. Generated from `tokens.json` — edit the JSON, then regenerate. |
| `components/bundle.css` | Styles for the components (`.sd-*` classes). Also `@import`s the Google Fonts. Load after `tokens.css`. |
| `components/bundle.js` | React 18 components on `window.SecondDrafts`: Button, Mark, StatusTag, TextField, MarginNote. Needs `window.React` / `window.ReactDOM`. |
| `components/index.d.ts` | Prop types, as documentation. |
| `components/<Name>/README.md` | Usage guidelines per component. |
| `fonts/` | `JosefinSans-Regular.ttf`. Not used by the site, which serves its fonts from `public/fonts/`. |

Logos are in `public/img/` and fonts in `public/fonts/`, both copied from the kit's `assets/logos/` and `assets/fonts/`.

## In this site

The site uses Astro components, not the React bundle. They are ported from `bundle.css` / `bundle.js` and keep the same `sd-*` class names, so the two can be compared:

- `src/components/` — `Button`, `Mark`, `StatusTag`, `TextField`, `ChoiceField`, `ScaleField`, `MarginNote`, plus `Link`, `HighlightedBand` and `Logo` from DESIGN.md. Each one has its own scoped styles.
- `src/components/DesignSystemHead.astro` — put it in a layout's `<head>`. It loads `src/styles/design-system.css` (which imports `tokens.css` here and `fonts.css`) and preloads the main fonts.
- `/sandbox` (dev only) shows every component in every theme.
