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

- [ ] Session progress shows the net change since load, including negative values.
- [ ] A sprint's time left stays correct after the tab spends several minutes in the background.
- [ ] Words written during a sprint exclude words that were already there.
- [ ] The end-of-sprint summary is announced to screen readers.
- [ ] No new storage keys are added.
