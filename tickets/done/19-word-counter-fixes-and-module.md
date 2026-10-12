# 19 · Word counter fixes, accessibility and module move

**Depends on:** #18
**Part of:** #17

## Why

The current page has several bugs that visitors will see, and it's built as one inline script, which makes every later ticket harder. Fixing the bugs is a good moment to give it the same structure as the teleprompter.

## What

### Move into a module

- Move the script out of `src/pages/tools/word-counter.astro` into `src/tools/word-counter/`, following the teleprompter's layout: a small store for `{ text, target }`, one mount function per part of the UI, and a thin `main.ts`. Use the shared `required()` from `src/lib/dom` in place of the page's own `querySelector` helper.
- Use #18 for all counting.
- Lay it out so later tickets don't collide: `main.ts` is a flat list of `mountX(store, hooks)` calls, and the page composes one `.astro` component per feature. A feature ticket (#21, #25, #27–#30) then adds one component and one mount line.

### Shared infrastructure

Several later tickets need the same teleprompter pieces. Promote them here, once, rather than in parallel tickets:

- `src/tools/teleprompter/lib/debounce.ts` moves to `src/lib/debounce.ts`.
- `confirm.ts` and `ConfirmDialog.astro` move to `src/lib/` and `src/components/`, for #20's Clear button.
- The teleprompter's store becomes a generic `createStore<State>` in `src/lib/`, and both tools use it.

### Target model (moved from #25)

A target is `{ unit, value, rule }`, with an optional `min` for ranges:

- `unit`: `words`, `characters` or `seconds` (spoken, via #18).
- `rule`: `at-most`, `at-least`, `exactly` or `around` (within a tolerance). The UI uses these plain words in place of Min, Max and Goal.

One pure function evaluates a measurement against a target and returns its state and status text. The colour, status line, cut line (#27), selection line (#28), presets (#25) and analytics (#23) all read from it. A `seconds` target's status reads in time (`15 sec to go`).

This ticket builds the model and the custom-target controls. #25 adds named presets on top.

### Bugs

- **The colour shows with the target turned off.** With "Show target" off, the count still turns red or green against a hidden target. With the target off, the count stays the normal ink colour.
- **A target of 0 or an empty target** divides by zero. An empty, zero or invalid target means "no target", which removes the special case.
- **The target only updates on `change`.** Typing a new number doesn't update the count until blur. Listen for `input`.
- **Large numbers aren't formatted.** Use `Intl.NumberFormat` for the count and target (`1,240 / 1,000 words`), like the teleprompter's edit view.
- **Wrong plural.** `1 words` should read `1 word`.

### Accessibility

- **Status is shown only by colour.** Add a text status next to the count, worded by the rule: `38 to go`, `12 over`, `On target`, `Within 5%`. Colour stays as a second cue.
- Give the status an `aria-live="polite"` region and announce changes only after typing settles (about 1 second), so screen readers aren't flooded on every keystroke.
- Keep the visible focus styles the page already has.

### Privacy scan

Update `scripts/privacy-scan.ts` for the renamed rule control.

## Acceptance criteria

- [x] The page's script lives in `src/tools/word-counter/`, and the `.astro` page holds only markup, styles and component composition.
- [x] With the target off, the count is never coloured.
- [x] A target of 0, empty or negative behaves as no target; no `Infinity` or `NaN` reaches the DOM.
- [x] Typing in the target field updates the display immediately.
- [x] Each rule shows a text status; a screen reader announces the settled status once after typing stops.
- [x] Unit tests cover the status wording for each rule and unit, at, under and over target, including ranges (`min`) and `seconds`.
- [x] `debounce`, the confirm dialog and the store live in shared locations, and the teleprompter uses them.
- [x] `npm run privacy:scan` passes.

## Outcome

**Layout.** `src/tools/word-counter/`:

- `lib/state.ts`: the state is `{ text, showTarget, target }`. `activeTarget()` and `summarize()` derive the count line and evaluation from it.
- `lib/target.ts`: the target model and `evaluateTarget`.
- `lib/readout.ts`: the count text and amount formatting.
- One `.astro` component and one `mountX(store)` per part: `Editor`, `CountLine`, `TargetPanel`.
- `main.ts` is the list of mounts, and puts the store on `window.__wcStore` in dev.

**Shared infrastructure.**

- `src/lib/store.ts` is the generic `createStore(initial, apply)`, with `mergeShallow` for flat state. The teleprompter passes its nested-settings merge.
- `src/lib/debounce.ts` is shared.
- `src/lib/confirm.ts` and `src/components/ConfirmDialog.astro` are shared, using `data-confirm` and `data-confirm-part`.

**Target decisions.**

- A target is active only when it's switched on and its value is above 0. An empty or partly typed number is stored as 0, so `NaN` never reaches the store or the DOM.
- `around` allows ±10% (`AROUND_TOLERANCE`).
- `min` makes anything below it "under", whatever the rule.
- `seconds` amounts are rounded to whole seconds before evaluating, so a status never reads "0 sec to go".
- Status wording by rule:

  | Rule | Under | At | Over |
  |---|---|---|---|
  | at-most | `38 left` | `At the limit` | `12 over` |
  | at-least | `38 to go` | `Target reached` | `Target reached` |
  | exactly | `38 to go` | `On target` | `12 over` |
  | around | `38 to go` outside the tolerance, `Within 4%` inside it | `On target` | `12 over` outside the tolerance, `Within 4%` inside it |

- Colour: met is `--green-ink` and over is `--red-pen`. Under, and any count without a target, is the normal ink colour.

**The page.**

- The controls are `#wc-text`, `#wc-show-target`, `#wc-rule`, `#wc-target` and `#wc-unit`. The unit select gained "Seconds aloud". The privacy scan step is updated, and the scan passes.
- The live region announces `count, status` once typing has been still for one second, and never repeats an unchanged announcement.
