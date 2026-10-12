# 23 · Word counter analytics

**Depends on:** #19
**Part of:** #17

## Why

We can't tell yet whether anyone uses the word counter, or which of the bigger features (#26, #29, #30) are worth the effort. The teleprompter's events answered that question for it. Same approach, same privacy rule.

## What

Add `wc_` events to `EVENT_SCHEMA` in `src/lib/analytics/events.ts`. Properties never carry text or anything derived from it beyond a word-count bucket.

| Event | Properties | When |
|---|---|---|
| `wc_text_entered` | `word_bucket`, `source` (`paste` / `typed` / `restored`) | Once per visit, after text settles (like `tp_script_entered`) |
| `wc_target_set` | `preset` (preset ID or `custom`), `unit`, `rule` | When a target is chosen, debounced |
| `wc_target_reached` | `preset`, `rule` | First time per visit the status becomes on-target |
| `wc_opened_in_teleprompter` | `word_bucket` | #22 handoff |
| `wc_engaged` | `word_bucket`, `duration_s` | Active for more than 60 s with more than 50 words, like `tp_engaged` |

Register the later tickets' events here as well, with their hooks, so those tickets only call a hook and never edit `EVENT_SCHEMA` or the lock file. Several of them would otherwise run in parallel and conflict on both:

| Event | Properties | Fired by |
|---|---|---|
| `wc_cut_line_shown` | `rule`, `unit` | #27, once per visit |
| `wc_selection_counted` | none | #28, once per visit |
| `wc_sprint_started` | `minutes` | #29 |
| `wc_sprint_finished` | `minutes`, `word_bucket` | #29 |
| `wc_rhythm_opened` | none | #30 |
| `wc_rhythm_sentence_clicked` | none | #30 |

Also add `word_counter` to `ScriptSource` for #22's `tp_script_entered`.

- Put the tracking in `src/tools/word-counter/usage-tracking.ts`, mirroring the teleprompter's file, so the UI code only calls hooks.
- Make one `npm run privacy:lock` bump for all of it. The longer word buckets are done in #18.
- **Optional fake doors.** If you'd rather sequence #26, #29 and #30 by demand than build them all, ship them as fake doors first. Generalise `FakeDoors.astro`, `fake-doors.ts` and the `tp_fake_door_*` events so both tools share them; don't copy them.

## Acceptance criteria

- [ ] All events above fire with the correct properties (unit tests, like `usage-tracking.test.ts`).
- [ ] Every event for #22 and #27–#30 is in the schema with a hook, so those tickets don't touch the schema or lock file.
- [ ] No event fires before analytics consent.
- [ ] `npm run privacy:lock` run; the lock test passes.
- [ ] The privacy policy's analytics description covers the word counter.
