# 24 · Tool SEO pages and tools listing

**Depends on:** #19, #21
**Part of:** #17

## Why

The teleprompter page has a title, description, canonical URL, Open Graph image, FAQ with structured data, and explanatory content under the tool. The word counter has none of these, and "word counter" is a high-volume search. The tools page describes it only as "A simple tool to count words in your text."

## What

Scope widened beyond the word counter: the writing sprint (#31) and draft analysis (#32) had the same gaps, so all three get the same treatment. Each tool has `SeoContent.astro` and `faq.ts` in its folder, rendered through the shared `SeoArticle`.

- **Head:** SEO title (for example "Free Word Counter: Words, Characters and Speaking Time"), description, canonical, Open Graph and Twitter tags, `WebApplication` JSON-LD, all following `src/pages/tools/teleprompter.astro`. That page builds its head inline; with a second tool needing the same thing, extract a shared `ToolHead` component and move the teleprompter onto it.
- **Open Graph image:** add `scripts/og/word-counter.html` alongside the teleprompter's template and render it with `scripts/og/render.js`.
- **Content under the tool** (plain HTML, like `SeoContent.astro`): how words and characters are counted (from #18's rules), how speaking time is estimated, what each target rule means, and privacy ("your text never leaves your browser").
- **FAQ** with `FAQPage` JSON-LD. Do hyphenated words count as one? Are spaces counted? How long is 500 words aloud? Is my text saved or uploaded? How do I check a limit for an essay, post or contest?
- **Tools page:** replace the description in `src/pages/tools.astro` with one that says what's different: limits for common formats, speaking time, and seeing what to cut (adjust to whichever of #25 and #27 have shipped).

## Acceptance criteria

- [ ] Title, description, canonical, OG and Twitter tags, and both JSON-LD blocks are present and valid (Rich Results Test). Checked structurally in the build (FAQ questions and answers, required `WebApplication` fields). Rich Results Test needs a public URL, so run it after deploy.
- [x] The teleprompter and word counter share one head component (`ToolHead`), as do the sprint and analysis; the teleprompter head is unchanged.
- [x] The OG images render at 1200×630.
- [x] FAQ answers match the tool's actual behaviour.
- [x] Lighthouse SEO and accessibility scores on mobile are in line with the teleprompter page (all four: accessibility 100, SEO 92 on the dev server, where the only failure is the Astro dev toolbar's "Learn more" link).
