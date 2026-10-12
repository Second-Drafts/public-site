# 24 · Word counter SEO page and tools listing

**Depends on:** #19, #21
**Part of:** #17

## Why

The teleprompter page has a title, description, canonical URL, Open Graph image, FAQ with structured data, and explanatory content under the tool. The word counter has none of these, and "word counter" is a high-volume search. The tools page describes it only as "A simple tool to count words in your text."

## What

- **Head:** SEO title (for example "Free Word Counter: Words, Characters and Speaking Time"), description, canonical, Open Graph and Twitter tags, `WebApplication` JSON-LD, all following `src/pages/tools/teleprompter.astro`. That page builds its head inline; with a second tool needing the same thing, extract a shared `ToolHead` component and move the teleprompter onto it.
- **Open Graph image:** add `scripts/og/word-counter.html` alongside the teleprompter's template and render it with `scripts/og/render.js`.
- **Content under the tool** (plain HTML, like `SeoContent.astro`): how words and characters are counted (from #18's rules), how speaking time is estimated, what each target rule means, and privacy ("your text never leaves your browser").
- **FAQ** with `FAQPage` JSON-LD. Do hyphenated words count as one? Are spaces counted? How long is 500 words aloud? Is my text saved or uploaded? How do I check a limit for an essay, post or contest?
- **Tools page:** replace the description in `src/pages/tools.astro` with one that says what's different: limits for common formats, speaking time, and seeing what to cut (adjust to whichever of #25 and #27 have shipped).

## Acceptance criteria

- [ ] Title, description, canonical, OG and Twitter tags, and both JSON-LD blocks are present and valid (Rich Results Test).
- [ ] The teleprompter and word counter share one head component.
- [ ] The OG image renders at 1200×630.
- [ ] FAQ answers match the tool's actual behaviour.
- [ ] Lighthouse SEO and accessibility scores on mobile are in line with the teleprompter page.
