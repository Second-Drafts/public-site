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

- [ ] Scan passes against the test property with collect requests allowed.
- [ ] The production property receives no scan traffic.
- [ ] `registry.lock.json` is unchanged.
