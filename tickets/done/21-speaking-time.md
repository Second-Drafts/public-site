# 21 · Show speaking time

**Depends on:** #18, #19 (display only; the formatter is done in #18)
**Part of:** #17

## Why

A lot of word counting is really time counting: a two-minute talk, a 60-second ad read, a five-minute open-mic slot. The teleprompter already estimates read time at 150 words per minute. Showing it here costs almost nothing and points naturally toward the teleprompter (#22).

## What

- Next to the count, show the speaking time from #18: `412 words · About 3 min aloud`.
- Use #18's `formatSpeakingTime`, which already shows seconds under a minute (`About 45 sec aloud`). This ticket is display only; don't change the formatter.
- Say the assumed pace once, in quiet text or a tooltip: "at 150 words per minute, a relaxed speaking pace." Don't add a speed control yet.
- Hide the speaking time when the text is empty.

## Acceptance criteria

- [x] The speaking time updates as the visitor types and matches the teleprompter's estimate for the same text.
- [x] Under a minute shows seconds; an hour or more shows hours and minutes.
- [x] The assumed pace is stated somewhere on the page (as a tooltip on the time).

## Outcome

- The time sits on a second line under the count, with "Open in Teleprompter" at the right of the same line, and hides when the text is empty. A first version stated the pace as a line of text; it cluttered the page, so the pace is now only the tooltip on the time ("At 150 words per minute"). Touch users don't see a tooltip, so the "stated somewhere on the page" criterion is met weakly.
- The time uses `formatSpeakingTime(speakingSeconds(words))`, the same call the teleprompter makes, via `speakingTime` in `lib/state.ts`.
- It hides when the target is in "minutes aloud", because the count already reads in spoken time and a second time would repeat it.
- It stays out of the polite live region, so screen readers aren't told on every keystroke.
