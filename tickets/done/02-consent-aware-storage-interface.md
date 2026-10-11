# 02 · Consent-aware storage interface

**Depends on:** #01
**Part of:** #00

## Why

Callers shouldn't decide where a value is stored or whether they're allowed to store it. If the interface knows a key's storage area and category from the registry, a write without consent becomes a no-op, and no caller can forget to check.

## What

Move `src/tools/teleprompter/lib/storage.ts` to `src/lib/privacy/storage.ts` and change its interface from "key + area" to "registered key":

```ts
const settings = stored("tp:settings:v1");   // key typed against the registry
settings.read();          // string | null
settings.readJSON();      // unknown
settings.write(value);    // no-op if the key's category isn't granted
settings.writeJSON(value);
settings.remove();
```

- The storage area comes from the registry; callers never pass it. First-party entries can only be `local` or `session` (#01), so `stored()` never writes cookies.
- Writes and reads for a category that isn't granted do nothing and return `null`. In dev, log a warning naming the key and category.
- Keep the existing behaviour of swallowing errors when storage is blocked (private mode, disabled storage).
- Consent is read from the consent module (#04). Until #04 lands, stub it as "analytics not granted", which is also the correct behaviour before any choice is made.
- Expose `purgeCategory(category)` that removes every registered key in that category from every area, including vendor cookies. Enumerate the names actually present in each area (localStorage, sessionStorage, `document.cookie`) and remove those where `findStorageEntry(area, name)?.category === category`. Don't match `_ga_*`-style patterns yourself. Cookies have to be deleted with the domain and path they were set with: try both host-only and `.seconddrafts.com`, path `/`.
- Delete `KEYS` from the teleprompter; callers import keys by name from the registry type.

### Migrate callers

- `src/tools/teleprompter/main.ts` (script, settings)
- `src/tools/teleprompter/prompt-hint.ts` (hintSeen)
The analytics keys (`tp:sessionId`, `tp:lastVisit`, `tp:visitRecorded`) were deleted in #01, so analytics has no storage callers to migrate.

## Acceptance criteria

- [ ] `src/lib/privacy/storage.ts` exists; the teleprompter's `lib/storage.ts` and `KEYS` are gone.
- [ ] Passing an unregistered key is a type error.
- [ ] Unit tests: necessary keys read and write with no consent; analytics keys are no-ops without consent and work with it (no first-party analytics key exists after #01, so test with a stubbed registry entry); `purgeCategory("analytics")` removes local, session and cookie entries including `_ga_*` patterns.
- [ ] Existing teleprompter tests still pass.
- [ ] Manual check: fresh visit to the teleprompter writes only `tp:*` necessary keys.
