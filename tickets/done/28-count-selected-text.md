# 28 · Count the selected text

**Depends on:** #18, #19, #23
**Part of:** #17

## Why

When trimming, writers want the count of one paragraph or passage: "if I cut this, where do I land?" Selecting text to see its count is cheap to build and useful every time.

## What

- When part of the text is selected, show the selection's count beside the total: `48 of 412 words selected`. Include speaking time if #21 has shipped.
- When a target is on, also show the result of cutting the selection: `Cut these to land at 364 / 400`. Measure the text with the selection removed, rather than subtracting the selection's count from the total. The two differ when a selection starts or ends mid-word. Evaluate the result with #19's target model for its status.
- Listen to the textarea's `select` event and `selectionchange`, and clear the selection count when the selection collapses.
- Count with #18 so selection counts and totals always agree.
- Fire `wc_selection_counted` once per visit, through the hook #23 registered.

## Acceptance criteria

- [x] Selecting with mouse, keyboard (Shift+arrows, Cmd/Ctrl+A) and touch shows the selection count. (touch not tried on a real phone)
- [x] Collapsing the selection hides it.
- [x] Counts for a selection match counting the same text pasted on its own.
- [x] With a target on, the "cut these" line shows the correct resulting count and status.

## Outcome

- `lib/selection.ts` (`summarizeSelection`) is the pure computation: selection count against the total, and with a target on, the count of the text with the selection removed, evaluated by `evaluateTarget`. Unit tests in `lib/selection.test.ts`.
- `SelectionLine.astro` + `selection-line.ts` render `48 of 412 words selected` and `Cut these to land at 364 / 400 words <status>`. Selection is read from `#wc-text` on `select` and `selectionchange`, and stays out of the store and storage. Whitespace-only selections count as none. `usage.onSelectionCounted()` fires when the line shows.
- Not announced through a live region: selection changes are too chatty to speak.
- Speaking time left out (#21 not shipped). Added `unitLabel` to `lib/readout.ts`.
- Verified in a browser with Shift+arrows, `select()`, `setSelectionRange` and collapsing. Cmd/Ctrl+A in headless Chrome did not select the textarea, and touch selection on a real phone was not tried.
