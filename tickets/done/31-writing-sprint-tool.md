# 31 · Writing sprint tool

**Depends on:** #18, #23
**Part of:** #17 (spun out of #29)

## Why

#29 put a sprint timer in the word counter. In use, it didn't belong there. The counter is for getting a draft under a limit; a sprint is for getting words down in the first place. A sprint wants a focused writing screen, with the timer beside the text and nothing else competing, which fights with the counter's target, rhythm and selection panels. So sprints become their own tool, and the counter keeps only `+412 this session`.

## What

### Flow

- Choose a length: 10, 15 or 25 minutes, or a custom length. Then press **Start**, which sits below the choices rather than in the same row.
- **Start** focuses the text, so the writer can begin typing at once.
- While a sprint runs, the timer and its controls sit next to the text, not in a panel below it:
  - time left (the running word count is the one under the text);
  - **Pause** and resume;
  - **Stop**;
  - an eye toggle that hides the timer for writers who find it distracting, and shows it again. Hiding must not stop the sprint.
- At the end, show `25 minutes · 640 words` in the page and announce it to screen readers. No sound, and no notification permission prompt.

### Carried over from #29

The first version was built and then removed in the commit that created this ticket. `git show 6aa710c` has the parts worth reusing:

- `src/tools/word-counter/lib/sprint.ts` and its tests: time left from timestamps (right after a backgrounded tab wakes), sprint words as the net change since the start floored at 0, the clock and summary text.
- A 250ms re-render plus `visibilitychange`, never a counting interval.
- Count with `src/lib/text/measure.ts`, so numbers match the word counter and teleprompter.
- The countdown bar animates only under `prefers-reduced-motion: no-preference`.

Pause needs the timer model to grow: time left must be based on elapsed running time, not wall time since the start.

### A new tool

- Lay it out like the other tools: `src/tools/writing-sprint/` with a store and a mount function per part, and a page in `src/pages/tools/` that only composes components. Add it to the tools index.
- Decide whether the text is saved between visits. If it is, that's a new storage key in the privacy registry; reuse the word counter's approach (#20).
- Analytics: `wc_sprint_started` and `wc_sprint_finished` are still in `EVENT_SCHEMA` and the lock, but nothing fires them since they left the word counter. Replace them with events named for this tool, and remove the `wc_sprint_*` pair, in one `npm run privacy:lock` bump. Until then, the privacy policy lists two events that never fire.
- Run the `privacy-reviewer` agent, since this adds a tool under `src/tools`.
- Consider an "open in word counter" hand-off for the finished draft, the way #22 links the counter to the teleprompter.

## Acceptance criteria

- [x] Start sits below the length choices and focuses the text.
- [x] The timer, pause, stop and hide controls sit next to the text while a sprint runs.
- [x] Hiding the timer doesn't stop or pause the sprint.
- [x] Pause and resume keep time left correct, including across a backgrounded tab.
- [x] Words written during a sprint exclude words that were already there.
- [x] The end-of-sprint summary is announced to screen readers.
- [x] The `wc_sprint_*` events are replaced in the schema and lock, and the privacy policy lists only events that fire.

## Outcome

- Built as `src/tools/writing-sprint/` at `/tools/writing-sprint`, listed on the tools index. Setup (10, 15, 25 or custom minutes, with **Start** below) swaps for a bar above the text with time left, **Pause**/**Resume**, **Stop** and a hide-timer toggle. Start focuses the text.
- The timer model grew pause: time left comes from running time only (`elapsedBeforePauseMs` plus the current stretch), so pausing and a backgrounded tab both stay correct. Tests cover each.
- The draft is saved under its own key, `ws:text`, separate from the word counter's `wc:text`.
- A light word count sits under the text. There is no hand-off to the word counter; #32 (the writing analysis tool) takes the finished draft instead.
- `wc_sprint_*` became `ws_sprint_started` and `ws_sprint_finished`, with the new storage key, in one lock bump to 2.3.0. The privacy scan now types into this tool too.
