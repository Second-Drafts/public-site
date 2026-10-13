# 25 · Format presets

**Depends on:** #19, #20, #23
**Part of:** #17

## Why

The Targets panel asks for a unit, a number and a rule. That's hard to fill in at a glance, and it isn't how writers think. They think in formats: a drabble, a Common App essay, a post on Bluesky. One picker that sets all three is easier to use, and it's the feature that most sets this tool apart.

## What

### Presets

The target model, its rules, ranges, `seconds` unit and status wording are built in #19. This ticket adds named presets on top and doesn't change how targets are evaluated.

- A preset is `{ id, name, group, description, target }`. Its target uses #19's model, including `min` for ranges (Common App: 250–650 words).
- Status, colour, the cut line (#27) and analytics (#23) read from the target, never from the preset.
- The saved settings already have a `preset` field (#20).

### Picker

- One select or combobox at the top of the panel: **None**, a list of presets grouped by kind, and **Custom**.
- Choosing a preset fills in the unit, value and rule, and shows a one-line description ("A story of exactly 100 words").
- Editing any field switches the picker to Custom while keeping the values.
- The chosen preset or custom target is saved via #20.

### Starting presets

Confirm every number against a current source before shipping; platform limits change.

| Group | Preset | Target |
|---|---|---|
| Fiction | Six-word story | exactly 6 words |
| Fiction | Drabble | exactly 100 words |
| Fiction | Microfiction | at most 300 words |
| Fiction | Flash fiction | at most 1,000 words |
| Fiction | Short story | at most 7,500 words |
| Submissions | Query letter | around 300 words |
| Submissions | One-page synopsis | at most 500 words |
| Submissions | Logline | at most 50 words |
| Essays | Common App personal essay | 250–650 words |
| Social | X post | at most 280 characters (note that X weights links and some scripts differently) |
| Social | Bluesky post | at most 300 characters |
| Social | Threads post | at most 500 characters |
| Spoken | 30-second read | around 30 seconds |
| Spoken | 60-second read | around 60 seconds |
| Spoken | Five-minute talk | around 5 minutes |

### Privacy scan

The scan's `countWords` step sets a custom target (updated in #19). Update it to pick a preset first.

## Acceptance criteria

- [x] Choosing a preset sets unit, value and rule; editing any of them switches to Custom.
- [x] The Common App preset shows under, within and over correctly (the range logic itself is tested in #19).
- [x] The spoken presets count speaking time, and their status reads in time ("15 sec to go").
- [x] The preset survives a reload.
- [x] Every preset number has been checked against a current source, with the source noted in the ticket's Outcome.
- [x] `npm run privacy:scan` passes with the updated scan step.

## Notes from #19

The custom-target controls have no field for `min`. If someone picks a range preset (Common App) and then edits a field, the picker switches to Custom. Either show a minimum field for that case or drop `min`; don't keep a range the visitor can't see.

## Outcome

Added `lib/presets.ts` (the 15 presets, grouping and picker helpers, tested in `presets.test.ts`) and a **Format** picker at the top of the Targets panel: None, presets grouped by kind, Custom, with a one-line description under it. Choosing a preset sets the target, turns "Show target" on and saves `presetId` through the existing settings. No storage, registry, event or lock-file changes. The privacy scan now picks the Query letter preset, then switches the unit to characters so the custom-target path is still driven.

Decisions:
- **None** hides the target and keeps the values; ticking "Show target" while on None moves the picker to Custom. A saved id that is no longer in the list shows as Custom.
- **Range presets (`min`):** editing any field drops `min` and switches to Custom, since no field shows a minimum. Picking Common App, then changing 650 to 500 gives a plain "at most 500". Adding a minimum field would be a separate ticket.
- The X description mentions link and script weighting; the counter itself still counts characters.

Sources (checked 2026-10-13, via web search; official pages were not directly fetched):
- Common App 250-650 words: Common App essay guides (Solomon Admissions, Cognito 2026-27 prompts) and The Harvard Crimson on strict enforcement. Unchanged.
- Bluesky 300 characters: several tool and vendor pages agree; Bluesky counts graphemes, so emoji count as one. Unchanged.
- Threads 500 characters: OneUp and Emplifi; Threads also has 10,000-character text attachments, which this preset ignores. Sources conflict on whether links count. Unchanged.
- X 280 characters: Circleboom, Bundle.social, Metricool; links count as 23, and sources disagree on emoji weighting. Premium accounts can post longer. Unchanged.
- Drabble 100, six-word story 6, microfiction 300, flash fiction 1,000: Scribophile, Masters Review, SF Encyclopedia. Boundaries are loose conventions. Unchanged.
- Short story 7,500: SFWA Nebula rules (short story under 7,500 words). Unchanged.
- Query letter ~300: informal advice of 250-350 words (Anne R. Allen, Jericho Writers); agents' own guidelines override it. Unchanged.
- One-page synopsis 500: most sources (We Are Whitefox, others). Unchanged.
- Logline 50: sources only say one or two sentences. No source found for a 50-word figure, so it is a convention, not a verified limit.
- Spoken presets use the shared speaking-time measure; nothing external to check.

Not verified: the official X, Bluesky, Threads and Common App pages. `npm run typecheck` reports three pre-existing errors in `src/lib/blog.ts` that this change doesn't touch.
- Later redesigned after use: the Show target checkbox and the grouped Format dropdown were replaced. A "Set a target" link in the count line opens a drawer with the target as one sentence ("Aim for at most 240 words") and the formats as links underneath. No target is the default, and an empty number means none. A "between" rule shows a range's minimum, so editing Common App keeps it instead of dropping it. It was chosen from four prototypes (a fill-in sentence, a shelf of formats, a search field, and a link in the count line); the shipped design combines the first and last.
