# 29 · Session progress and writing sprints

**Depends on:** #19, #20, #23
**Part of:** #17

## Why

So far every idea serves cutting. This one serves drafting: "+412 words this session" rewards sitting down to write, and a sprint timer gives people a reason to keep the tab open and come back.

## What

### Session progress

- Record the word count when the page loads (after restoring saved text, from #20).
- Show the change since then: `+412 this session`. Cutting shows as negative, framed positively, since cutting is progress in a second draft: `−86 this session (trimmed)`.
- Keep it in memory only. A reload starts a new session, so no new storage key is needed.

### Sprint timer

- A **Start a sprint** control with 10, 15, 25 minutes and a custom length.
- During a sprint, show time left and words written in this sprint. At the end, show a summary in the page: `25 minutes · 640 words`. No sound, and no notification permission prompt.
- The timer stays accurate in a background tab: compute from timestamps, not a counting interval.
- Respect `prefers-reduced-motion` for any countdown animation.
- Fire `wc_sprint_started { minutes }` and `wc_sprint_finished { minutes, word_bucket }` through the hooks #23 registered.

If #23's fake door for sprints is shipped first, use its results to decide whether to build the timer half of this ticket.

## Acceptance criteria

- [x] Session progress shows the net change since load, including negative values.
- [x] A sprint's time left stays correct after the tab spends several minutes in the background.
- [x] Words written during a sprint exclude words that were already there.
- [x] The end-of-sprint summary is announced to screen readers.
- [x] No new storage keys are added.

## Outcome

Added `SessionPanel.astro` and `session-panel.ts`, mounted with one line in `main.ts` and one component in the page. Pure logic lives in `lib/session.ts` and `lib/sprint.ts` with unit tests.

- Session progress: baseline is the word count at mount (after saved text is restored), held in memory only. Shows `+412 this session`, `−86 this session (trimmed)`, or `No change this session`.
- Sprints: 10, 15, 25 minute buttons and a custom length (whole minutes, 1 to 180). Time left is computed from `Date.now()` timestamps on a 250ms tick and on `visibilitychange`, so it is right after a backgrounded tab wakes. The countdown bar only animates under `prefers-reduced-motion: no-preference`.
- Sprint words are the net change in word count since the sprint started, floored at 0. Deleting then retyping the same amount counts as 0, and cutting never shows a negative.
- The end-of-sprint summary (`25 minutes · 640 words`) is in a `role="status"` region, so it is announced. The ticking clock is a `role="timer"`, which is not announced.
- `usage.onSprintStarted` and `onSprintFinished` are called; a stopped sprint reports no finish. No new storage keys.
- Not verified: a real multi-minute background tab (the timer was checked by stubbing `Date.now`), screen reader output, and the final `[hidden]` CSS fix for the setup row was not re-checked in the browser after the edit.
