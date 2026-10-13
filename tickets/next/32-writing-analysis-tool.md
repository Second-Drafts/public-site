# 32 · Writing analysis tool

**Depends on:** #18, #23
**Part of:** #17 (spun out of #30)

## Why

#30 put a sentence rhythm strip in the word counter. It was useful, but it's one view of a bigger job: looking at how a draft reads, not just how long it is. That job deserves its own tool with room for several views. The word counter can then stay focused on getting a draft to a limit.

## What

- A tool for looking at a draft as writing. Sentence rhythm is the first view. Candidates for later views include long and short sentence runs, paragraph lengths, repeated words, and reading or speaking time per section.
- Lay it out like the other tools: `src/tools/<name>/` with a store and a mount function per part, and a page in `src/pages/tools/` that only composes components. Add it to the tools index.
- Use #18's `sentences()` and `measure()`, so its numbers match the word counter and teleprompter.

### Carried over from #30

The rhythm strip was built and then removed in the commit that created this ticket. `git show 0256dc3` has the parts worth reusing:

- `src/tools/word-counter/lib/rhythm.ts` and its tests: the summary line, the long-sentence threshold, and SVG geometry that draws thousands of sentences as three paths.
- `src/tools/word-counter/rhythm-strip.ts`: pointer and keyboard selection of a bar, and recomputing only after typing settles. It stayed within one frame per keystroke at 20,000 words.
- `TextHighlights.reveal(kind)` in `src/lib/text-highlights.ts`: scrolls the textarea to a painted span. It was removed with the strip; restore it if the tool selects text in a textarea.

### Analytics and privacy

- `wc_rhythm_opened` and `wc_rhythm_sentence_clicked` are still in `EVENT_SCHEMA` and the lock, but nothing fires them. Replace them with events named for this tool, in one `npm run privacy:lock` bump. Until then, the privacy policy lists two events that never fire. #31 has the same loose end for the `wc_sprint_*` events; one bump can cover both.
- Run the `privacy-reviewer` agent, since this adds a tool under `src/tools`.

## Acceptance criteria

- [ ] The tool shows sentence rhythm for pasted or typed text, using #18's `sentences()`.
- [ ] Typing stays smooth with 20,000 words.
- [ ] The `wc_rhythm_*` events are replaced in the schema and lock, and the privacy policy lists only events that fire.
