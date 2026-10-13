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

- [x] Over the limit, exactly the excess is shaded, for words, characters and seconds targets.
- [x] The shading stays aligned while typing, scrolling, resizing and switching themes, and with long unbroken words.
- [x] Undo, paste, spellcheck and mobile keyboards behave as in a plain textarea.
- [x] Readable in every theme, and not signalled by colour alone.
- [x] Screen readers get the text equivalent.
- [x] Typing stays smooth with 20,000 words.

## Outcome

- **Mirror over the textarea, not contenteditable.** The textarea stays native, so the risk is alignment rather than editing. The mirror sits *over* the textarea, not behind it: transparent glyphs, `pointer-events: none`, translucent marks. That way the textarea keeps its own background, border and focus ring, and nothing has to follow a theme switch.
- `src/lib/text-highlights.ts` is the reusable piece for #28 and #30. `attachTextHighlights(textarea)` returns `paint(kind, spans)`. Kinds can overlap. Each piece renders as `span[data-highlight~="kind"]`, and the piece where a span begins also carries `data-highlight-start~="kind"`, so a marker can sit at the start only. `mountEditor` now returns `{ highlights }`.
- The mirror keeps one block per line and replaces only the lines whose text or highlights changed. Without that, the cut cost about 20ms of layout per keystroke at 20,000 words. With it, the cut adds about 2.5ms to a 20,000-word text in paragraphs. One 20,000-word paragraph with no line breaks still costs about 20ms per keystroke, because the mirror lays out that paragraph again, just as the textarea does.
- `lib/cut-line.ts`: `cutOffset` only cuts when the status line says "over", so the two agree. A seconds target rounds, and 26 words against a 10 sec limit still reads "At the limit". It reuses #18's `limitOffset` for the position.
- Look: a red-pen tint and underline over the excess, and a 2px red-pen bar where the cut falls. The underline and bar mean it doesn't rely on colour alone. A strikethrough, like the design system's strike Mark, was tried first and dropped: it made the words too hard to read while editing them. Forced-colours mode has its own rule.
- The screen-reader line (`Your limit falls after “…the last four words”.`) goes in a polite live region 1 s after typing settles, the same pattern as the count line. `wc_cut_line_shown` fires through #23's once-per-visit hook.
- Verified in desktop Chromium (agent-browser): alignment in all three themes, scrolling, a classic scrollbar, resizing, 390px width, trailing newlines and a long unbroken word; clicking through the marks; undo and paste. Checked by hand in Firefox, Safari and iOS Safari.
- Found while testing: a content blocker that refused `/src/lib/analytics/events.ts` stopped the whole word counter in dev. In production, every tool's script statically imported a shared `analytics.*.js` chunk, so a blocker matching that name would do the same, and also break the consent banner in `Base.astro`. Pages now report through `src/lib/usage-reports.ts`, which imports `lib/analytics` lazily and does nothing if it can't load. The blocker costs the reports, not the page. Verified with `analytics/events.ts` aborted: the word counter, cut line, consent banner and teleprompter all work.
