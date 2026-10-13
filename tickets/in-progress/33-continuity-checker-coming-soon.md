# 33 · Continuity Checker coming soon page

**Depends on:** #34. This branch stays unmerged until the form exists, so the page can't deploy with its buttons pointing at `#`.
**Part of:** —

## Why

The Continuity Checker will be our first paid tool. The spike in `spike-manuscript-continuity` (`CONCLUSION.md`) found it ready to build: a strong second pair of eyes, not a guarantee. Before we build it, we want to know who wants it, what they write, and what they'd pay. A coming soon page at the tool's own URL lets us find out, and the same URL becomes the tool when it ships.

## What

- **Tools index:** list the Continuity Checker with a Soon tag. The Soon pill moves out of the teleprompter's fake doors into a shared `SoonTag` component. The lede drops "free", since not every tool will be.
- **`/tools/continuity-checker`:**
  - a hero with the headline "Catch it before your reader does" and a Join the waitlist button;
  - three example flags on a sample story (the door in the hill), in the shape the spike's output takes: sure or maybe, both passages quoted, a one-line reason;
  - what it checks, and why it's different;
  - where your manuscript goes;
  - a closing Highlighted band with a second button.
- **Claims:** only the ones `CONCLUSION.md` says we can make. Never "catches every error", a percentage, "replaces your editor", or anything about who knows what.
- **Payment:** not mentioned on the page.
- **Mock:** the examples are deliberately not a mock of the app's screens, which will change once the tool is built.
- **Analytics:** `cc_waitlist_clicked { placement: hero | band }`.
- **Sharing:** `ToolHead` with an OG image rendered from `scripts/og/continuity-checker.html`.

## Acceptance criteria

- [x] The tools index lists the Continuity Checker with a Soon tag.
- [x] The page builds, reads well in Paper and Night shift, and stacks on a phone.
- [x] `cc_waitlist_clicked` is in the lock and the privacy policy's event list, and is only sent with consent.
- [x] The OG image is rendered.
- [ ] Both buttons lead to the waitlist form from #34.
