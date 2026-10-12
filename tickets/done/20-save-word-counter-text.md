# 20 · Keep the visitor's text and settings

**Depends on:** #19
**Part of:** #17

## Why

The text disappears on reload. People paste in drafts they care about, and losing one is the fastest way to make sure they don't come back. The teleprompter already solved this with the consent-aware storage interface (#02).

## What

- Register two first-party keys in `STORAGE` in `src/lib/privacy/registry.ts`, both `necessary`, `local`, `until-cleared`:
  - `wc:text`: "Keeps the text you're counting in your browser, so it's still there when you come back."
  - `wc:settings:v1`: "Remembers your word counter target and format."
- Read and write them through `stored()` from `src/lib/privacy/storage.ts`, debounced like the teleprompter's `persistChanges` (500 ms for text, 300 ms for settings, flushed on `pagehide`).
- Validate saved settings on read, so a stale or hand-edited value falls back to defaults instead of breaking the page. Validate field by field, so one bad field doesn't discard the rest.
- Settings hold the target (#19), the chosen preset ID or `custom` (#25), and whether the rhythm strip is open (#30). Add all three now with defaults, so #25 and #30 don't need to change the validator.
- Add a **Clear** button with a confirm step, using the shared confirm dialog #19 promoted to `src/lib/` and `src/components/`.
- Run `npm run privacy:lock`. New necessary keys are a minor bump; confirm the generated cookie policy table lists them.

## Acceptance criteria

- [x] Type text, set a target, reload: both are restored.
- [x] Clear asks first, and after confirming, a reload shows an empty field.
- [x] Invalid saved settings fall back to defaults without errors.
- [x] The cookie policy lists `wc:text` and `wc:settings:v1`.
- [x] `npm run privacy:scan` passes and reports only registered keys.
- [x] No text reaches any network request (the scan already checks for this).

## Outcome

- `wc:text` and `wc:settings:v1` are registered (lock bumped to 2.1.0) and read and written through `stored()` by `src/tools/word-counter/persistence.ts`.
- `validateSettings` in `lib/settings.ts` validates field by field. Settings hold `showTarget`, `target`, `presetId` and `rhythmOpen`, all now in `State`, so #25 and #30 only read and write them.
- Clear sits under the text field and uses the shared confirm dialog.
- Checked by unit tests, `privacy:scan` and the built cookie policy page. The reload round trip wasn't exercised in a browser.
