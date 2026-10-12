# 27 · Show the cut line

**Depends on:** #18, #19, #23
**Part of:** #17

## Why

When a draft is over the limit, a counter that says "112 over" leaves the writer to find where the limit falls. Shading everything past the limit, the way X does, shows exactly what has to go. It's the "second draft" moment, and most word counters skip it.

## What

- When the rule is `at-most` or `exactly` (and, for ranges, the maximum) and the text is over, shade the part of the text past the limit.
- Words: the shading starts at the first word past the limit. Characters: at the first character past the limit. Seconds: convert to words via the speaking pace. #18's `limitOffset` already gives this position for all three units, so don't recompute it here.
- A textarea can't style ranges of its own text. Design it twice before choosing:
  - a highlight layer behind a transparent-background textarea, mirroring its font, padding, wrapping and scroll position; or
  - a `contenteditable` editor with the CSS Custom Highlight API.

  The first keeps native textarea behaviour (undo, paste, mobile keyboards, spellcheck), which is probably worth the mirroring work. Whichever wins, put it behind one small component so #28 and #30 can reuse the highlight.
- The shading must work in every theme and must not rely on colour alone (for example, a tint plus a strikethrough-style underline, or a marker at the cut point).
- A text equivalent for screen readers: "Your limit falls after '…the last few words'." Announce it only after typing settles.
- Fire `wc_cut_line_shown { rule, unit }` once per visit, through the hook #23 registered.

## Acceptance criteria

- [ ] Over the limit, exactly the excess is shaded, for words, characters and seconds targets.
- [ ] The shading stays aligned while typing, scrolling, resizing and switching themes, and with long unbroken words.
- [ ] Undo, paste, spellcheck and mobile keyboards behave as in a plain textarea.
- [ ] Readable in every theme, and not signalled by colour alone.
- [ ] Screen readers get the text equivalent.
- [ ] Typing stays smooth with 20,000 words.
