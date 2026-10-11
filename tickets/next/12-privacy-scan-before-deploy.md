# 12 · Privacy scan before every deploy

**Depends on:** #04, #05, #06 (#11 optional)
**Part of:** #00

## Why

Lint only sees our code. The scan is the ground truth: it loads the built site in a real browser and records everything it actually stores and contacts, including third parties and dependencies. This is the part paid consent tools charge for.

## What

`npm run privacy:scan`: a Playwright script against `astro preview` of the production build. (Chromium and Playwright are standard; add `@playwright/test` or `playwright` as a dev dependency.)

### Pages

Every URL in the built sitemap, plus the teleprompter opened with a share link.

### States

1. **No decision** (fresh context)
2. **Rejected** (via the banner)
3. **Accepted** (via the banner)
4. **GPC on** (`Sec-GPC` header and `navigator.globalPrivacyControl = true` via an init script)
5. **Accepted, then withdrawn** (via settings)

### In each state, collect

- Cookies (`context.cookies()`), localStorage and sessionStorage keys, IndexedDB database names, Cache Storage names
- The origin of every network request

### Fail the scan if

- Any key or cookie isn't in the registry. Look each one up with `findStorageEntry(area, name)` from #01, which handles patterns like `_ga_*`.
- A key in a consent-requiring category exists in a state where that category isn't granted (states 1, 2, 4, and 5 after withdrawal).
- A request goes to an origin that isn't `'self'` or a registered vendor origin, or to a consent-requiring vendor in a state without consent.

### Share-link leak check

Open the teleprompter with a share link whose script contains a unique sentinel string. Exercise it (play, change settings, accept analytics). Fail if any outgoing request URL or body contains the sentinel or its lz-string-compressed form. This proves the claim in #09 and #10.

### Testing Google Analytics for real

Use a **separate test GA property** (its own measurement ID) in the scan's build, so the accepted state sees GA's real cookies without polluting production data. Until GA is set up (#14), the accepted state just confirms no provider loads without a measurement ID.

### Record keeping

Write a report (`privacy/scan-report.json`: per state, the keys and origins seen) and commit it with each deploy. Git history then shows what the live site did at every release.

### Wire into deploy

`predeploy` becomes: lint → test → build → privacy scan.

## Acceptance criteria

- [ ] `npm run privacy:scan` runs all five states across the sitemap and passes on the current site.
- [ ] Adding an unregistered `localStorage` key (bypassing lint), or loading a script from a new origin, fails the scan.
- [ ] The share-link sentinel check passes.
- [ ] `predeploy` runs the scan; a failing scan blocks `npm run deploy`.
- [ ] Scan report is written and committed.

## Follow-up from #09

Once this scan passes, add the paragraph to the cookie policy (`src/pages/cookie-policy.astro`) saying the script stays on the visitor's device, and that share links carry it after the `#`, which browsers don't send to servers.

## Follow-up from #10

The same "script never leaves your device" statement belongs on the privacy policy (`src/pages/privacy-policy.astro`) once this scan passes.
