# 30 · Sentence rhythm strip

**Depends on:** #18, #19, #20, #23
**Part of:** #17

## Why

Writers are told to vary sentence length, but it's hard to see in a block of text. A thin strip with one bar per sentence, scaled to its length, shows at a glance where prose drags (a run of long bars) or gets choppy (a run of short ones). It's the lightweight cousin of the "say-ability check" from the teleprompter brainstorm, and it makes the tool useful past the counting.

## What

- Split the text with #18's `sentences()`. It already handles abbreviations, ellipses, dialogue and line breaks, so this ticket is the strip and its interactions only.
- Draw one bar per sentence, in reading order, with height proportional to word count. Mark sentences over a threshold (start at 30 words) without relying on colour alone.
- Clicking or tapping a bar selects that sentence in the textarea and scrolls to it. Reuse the highlight component from #27 if it exists.
- A text summary for everyone, including screen readers: `24 sentences · average 17 words · longest 48 words`.
- The strip is collapsed by default, so the page stays simple for people who only want a count. Remember the choice in the `rhythmOpen` field #20 added to `wc:settings:v1`.
- Recompute only after typing settles, so long texts stay smooth.
- Fire `wc_rhythm_opened` and `wc_rhythm_sentence_clicked` through the hooks #23 registered.

## Acceptance criteria

- [x] The strip uses #18's `sentences()`, with no sentence splitting of its own.
- [x] Bars match sentence lengths; clicking one selects that sentence.
- [x] Long sentences are marked by something other than colour.
- [x] The summary line is correct and readable by screen readers.
- [x] Typing stays smooth with 20,000 words and the strip open.

## Outcome

- `RhythmStrip.astro` and `rhythm-strip.ts` add one component and one `mountRhythmStrip(store, editor.highlights, usage)` line in `main.ts`. A disclosure button toggles `rhythmOpen` through the store (so `wc:settings:v1` remembers it) and fires `wc_rhythm_opened` on a user open, not on a restored one. Closing the strip clears its highlight.
- Pure logic is in `lib/rhythm.ts` with tests: summary (count, rounded average, longest, singular nouns), `LONG_SENTENCE_WORDS = 30`, per-sentence description, SVG path geometry, and pointer-to-bar mapping. Sentences come only from `sentences()`.
- **Rendering:** one SVG with three `<path>`s (normal bars, long bars, long marks), stretched with `preserveAspectRatio="none"`, so the cost doesn't grow with the number of sentences. A click is mapped to a bar from the pointer's position, so there is no element per bar. Bar height scales to the longest sentence, or to the threshold if no sentence reaches it.
- **Long sentences without colour:** a dashed threshold line that long bars rise past, a separate mark above each long bar, and the words "long sentence" in the detail line, plus a key under the strip.
- **Keyboard and screen readers:** the strip is one focus stop. Left/right/Home/End move a cursor, Enter or Space selects. A polite detail line reads `Sentence 2 of 3 · 4 words · “Four five six seven.”`. The summary line is plain text.
- **Selecting and scrolling:** the click paints a `sentence` highlight, focuses the textarea without scrolling, calls `setSelectionRange`, then `highlights.reveal("sentence")`. `reveal` is new in `lib/text-highlights.ts`: it renders the mirror at once, measures the first span's rectangle against the textarea's, and moves `scrollTop` just far enough (or to the span's top if it is taller than the textarea). Browsers disagree on whether setting the selection scrolls a textarea, so this measures instead. Checked scrolling both down and up.
- Recomputes 300 ms after typing settles. A click on a stale strip (text changed within that window) is ignored, so offsets never point at the wrong text. Any text change clears the sentence highlight.
- **Performance** (headless Chromium, dev server, 20,100 words in paragraphs, 1,675 sentences): a keystroke takes one frame (about 16.7 ms) with the strip closed and open. Opening, including splitting and drawing, took about 6 ms; `sentences()` itself about 3 ms.
- Verified in light, dark and highlighted themes, with keyboard navigation and clicks scrolling both ways. Not verified: Safari or Firefox, iOS touch, a screen reader, and forced-colors mode (styles written, not seen).
- Later removed from the word counter: sentence rhythm will be the first view of a writing analysis tool, #32. The strip, `lib/rhythm.ts`, `TextHighlights.reveal()`, the `rhythmOpen` setting and the rhythm hooks were removed; #32 says where to find them in history.
