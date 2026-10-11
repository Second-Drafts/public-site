# 01 · Privacy registry

**Depends on:** —
**Part of:** #00

## Why

Every fact about what the site stores on a visitor's device, and which third parties it talks to, needs to live in exactly one place. The storage interface, policy page, CSP, consent purge and scans all read from it.

## What

`src/lib/privacy/registry.ts` is already drafted (site-level, not inside the teleprompter, since more Story Station tools are coming). Read it first. This ticket is to review it, test it, and remove the analytics keys that no longer need to exist.

### Design decisions already made in the draft

Keep these unless you find a concrete problem; if you do, raise it rather than working around it.

- **Plain data, typed with `as const satisfies`.** Literal keys survive (so `FirstPartyKey` and `ConsentCategoryId` can be derived) while every entry is still shape-checked.
- **No imports and only erasable TypeScript.** Node 22 can load the file directly (`node scripts/....ts`), which #07's `privacy:lock` script relies on. Don't add enums, namespaces or imports.
- **First-party entries can't be cookies.** `FirstPartyStorage["area"]` is `local | session`. The site sets no first-party cookies, so #02 doesn't need a cookie writer. Vendor entries can be any area.
- **Every storage entry has its own `category`**, even vendor-set ones, so consumers can group and purge without looking up the vendor. A test keeps it equal to the vendor's category.
- **Vendor origins are split** into `scripts` (where code loads from → CSP `script-src`) and `data` (where it sends requests → `connect-src` and `img-src`). Both use CSP host-source syntax (`https://*.example.com`). The GA values follow Google's GA4 CSP guidance; #11 re-checks them.
- **Retention is structured**, not free text: `"until-tab-closed" | "until-cleared" | { months }`. #07 needs to tell when retention gets longer (ordering: tab-closed < any months < until-cleared), and #09 renders it with `describeRetention()`.
- **Patterns.** A vendor-set name may end in `*` (`_ga_*` matches `_ga_ABC123`). `findStorageEntry(area, actualName)` is the only place that interprets that syntax; #02's purge and #12's scan both go through it rather than matching names themselves.
- **GitHub Pages is a vendor** (category `necessary`, no origins because it's `'self'`), so the privacy policy (#10) and vendor records (#13) can generate the hosting disclosure from `VENDORS`. Its `role: "controller"` reflects that GitHub logs visitor IPs for its own security purposes; #13 confirms that against GitHub's current terms.

### Remove the analytics-only keys

`tp:sessionId`, `tp:lastVisit` and `tp:visitRecorded` aren't registered and should be deleted rather than registered. Nothing user-facing depends on them, and any analytics provider we'd use (GA4 included) tracks sessions and returning visitors itself. They were also written before consent.

In `src/tools/teleprompter/lib/analytics/`:

- Remove `getSessionId()`, the module-level `sessionId`, and `session_id` from `SessionContext` (leaving `device_type`).
- Remove `recordVisit()`, the `tp_return_visit` event from `TpEvents`, and the call in `trackPageView()`.
- Update `analytics.test.ts`: delete the `recordVisit` suite and the session-id tests and assertions, and drop the `sessionStorage` stub if nothing needs it.
- Remove `lastVisit`, `sessionId` and `visitRecorded` from `KEYS` in `lib/storage.ts`. Leave the rest of that file alone; #02 replaces it.

### Classification

| Key | Area | Category | Status |
|---|---|---|---|
| `tp:script` | local | necessary | Registered |
| `tp:settings:v1` | local | necessary | Registered |
| `tp:hintSeen` | local | necessary | Registered |
| `privacy:consent` | local | necessary | Registered now; written by #04 |
| `_ga` | cookie | analytics | Registered (Google Analytics) |
| `_ga_*` | cookie | analytics | Registered (Google Analytics) |
| `tp:sessionId`, `tp:lastVisit`, `tp:visitRecorded` | — | — | Deleted (see above) |
| `sandbox-theme` | local | — | Dev-only sandbox page, never deployed; excluded (see #03) |

## Acceptance criteria

- [ ] `src/lib/privacy/registry.ts` exports `CATEGORIES`, `VENDORS`, `STORAGE`, `FirstPartyKey`, `ConsentCategoryId`, `findStorageEntry` and `describeRetention` (as drafted, adjusted only with a reason).
- [ ] `tp:sessionId`, `tp:lastVisit`, `tp:visitRecorded`, `session_id` and `tp_return_visit` are gone from the code and tests.
- [ ] `src/lib/privacy/registry.test.ts` asserts:
  - every vendor-set entry names a registered vendor and has the same category as that vendor
  - no first-party name contains `*`, and only vendor-set names do
  - `purposeId` is a kebab-case slug, and each `purposeId` is used by only one entry
  - `findStorageEntry`: exact match, `_ga_*` matches `_ga_XYZ` but not `_ga` or `_gax`, the wrong area returns `undefined`, an unknown name returns `undefined`
  - `describeRetention` for each variant, including singular and plural (1 month, 13 months, 1 year, 2 years)
- [ ] A type-level check (`registry.typecheck.ts` using `// @ts-expect-error`; not `*.test.ts`, because vitest fails a file that contains no tests) shows that `"_ga"` and unregistered names aren't assignable to `FirstPartyKey`, and `"necessary"` isn't assignable to `ConsentCategoryId`. Add `"typecheck": "tsc --noEmit"` to `package.json` so it can be run. It passes today.
- [ ] `npm test` and `npm run typecheck` pass.
- [ ] Purpose, label and description text reads well on a public policy page: plain language, no internal jargon. Edit the drafted copy freely; keep `purposeId`s stable.
