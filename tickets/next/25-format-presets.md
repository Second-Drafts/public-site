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

- [ ] Choosing a preset sets unit, value and rule; editing any of them switches to Custom.
- [ ] The Common App preset shows under, within and over correctly (the range logic itself is tested in #19).
- [ ] The spoken presets count speaking time, and their status reads in time ("15 sec to go").
- [ ] The preset survives a reload.
- [ ] Every preset number has been checked against a current source, with the source noted in the ticket's Outcome.
- [ ] `npm run privacy:scan` passes with the updated scan step.

## Notes from #19

The custom-target controls have no field for `min`. If someone picks a range preset (Common App) and then edits a field, the picker switches to Custom. Either show a minimum field for that case or drop `min`; don't keep a range the visitor can't see.
