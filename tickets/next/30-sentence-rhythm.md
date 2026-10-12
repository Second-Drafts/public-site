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

- [ ] The strip uses #18's `sentences()`, with no sentence splitting of its own.
- [ ] Bars match sentence lengths; clicking one selects that sentence.
- [ ] Long sentences are marked by something other than colour.
- [ ] The summary line is correct and readable by screen readers.
- [ ] Typing stays smooth with 20,000 words and the strip open.
