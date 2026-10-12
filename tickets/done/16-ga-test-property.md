# 16 · Separate Google Analytics test property for the scan

**Depends on:** #14
**Part of:** #00

## Why

Ticket 14 shipped with a single GA4 property (production). So the privacy scan never sends visits to it, `scripts/privacy-scan.ts` aborts GA's `/collect` requests (`isGoogleCollectRequest`). That means the scan proves the script, cookies, origins and request contents, but never that Google accepts the hits.

## What

1. Create a second GA4 property for testing, with the same settings as `privacy/google-analytics.md`.
2. Give the scan build its own measurement ID (a build override, kept out of `public-env/.env.production`), so the scan scans a build that reports to the test property.
3. Remove `isGoogleCollectRequest` and the route that aborts it, so the scan's accepted state sends real hits to the test property.
4. Confirm in the test property's Realtime report that scan visits appear and the production property sees none.

## Acceptance criteria

- [x] Scan passes against the test property with collect requests allowed.
- [x] The production property receives no scan traffic.
- [x] `registry.lock.json` is unchanged.

## Outcome

Test property `G-RPVQBR9DFV` created 2026-10-12. `scripts/privacy-scan.ts` builds into `dist-privacy-scan/` with `PUBLIC_GA_MEASUREMENT_ID` overridden to the test ID, and scans that, so the deployed `dist/` keeps the production ID. The collect-request block is gone and the scan passes. GA4 drops visits from a `HeadlessChrome` user agent as bot traffic, so the scan's browser reports itself as plain `Chrome`; without that, Realtime showed nothing from the scan. With collect allowed, the scan no longer sees requests to `https://www.google.com`, which confirms they were GA's fallback for blocked hits. It stays registered, since real visitors on flaky networks can trigger the fallback.

Confirmed 2026-10-12: the scan's pages appear in the test property's Realtime report, and the scan build contains only the test ID. While debugging, one manual probe (not the scan) sent a single localhost page view to production by hitting a stray preview of `dist/` on port 4399.
