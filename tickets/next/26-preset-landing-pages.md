# 26 · Landing pages for popular presets

**Depends on:** #24, #25, and data from #23
**Part of:** #17

## Why

People search for the format, not the tool: "drabble word counter", "common app essay word count", "bluesky character counter". A page per format, with the tool preloaded, can rank for each of those searches. Don't start until #23 shows which presets people actually pick; build pages for those first.

## What

- Generate a static page per chosen preset, for example `/tools/word-counter/drabble/`, from the preset data in #25, so adding a page is a data change.
- Each page has the full tool with its preset selected, its own title, description, canonical URL, and a short intro about the format (what it is, where the limit comes from, a tip or two).
- A preset page's choice doesn't overwrite a visitor's saved preset until they type or change something there.
- All pages share the head component from #24 and link back to the main word counter.
- Add the pages to the sitemap.

## Acceptance criteria

- [ ] Adding a landing page needs only a preset entry and its intro copy.
- [ ] Each page loads with its preset selected and has a unique title, description and canonical URL.
- [ ] Visiting a preset page and leaving without editing doesn't change the saved preset.
- [ ] Pages appear in the sitemap and pass Lighthouse SEO.
- [ ] `npm run privacy:scan` covers at least one preset page.
