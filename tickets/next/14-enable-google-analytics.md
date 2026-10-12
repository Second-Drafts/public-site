# 14 · Turn on Google Analytics

**Depends on:** #01–#13
**Part of:** #00

## Why

This is the payoff. Everything before this ticket assumed Google Analytics is present, so turning it on should be configuration, with no policy or registry change.

## What

1. Create the production GA4 property and a separate test property.
2. Work through the `privacy/google-analytics.md` checklist (#13) and record the date.
3. Set `PUBLIC_ANALYTICS_PROVIDER=gtag` and `PUBLIC_GA_MEASUREMENT_ID` for production builds; set the test ID for scan builds (#12).
4. Run `npm run privacy:scan` with the test property. In the accepted state, confirm GA's real cookies match the registry (`_ga`, `_ga_<ID>`) and its requests match the registered origins and CSP.
5. Deploy.

**If the scan finds anything unregistered,** the assumption in #00 was wrong. Stop and update the registry, lock, policy and (for a major bump) re-consent before deploying, rather than editing the scan to pass.

## Acceptance criteria

- [x] GA checklist complete and dated.
- [x] Scan passes with GA on (collect requests blocked; the test property moved to #16). The registry gained `https://www.google.com` (minor bump, no re-consent).
- [x] Production deploy with GA on; a fresh visit sets no `_ga*` cookies until Accept.

## Follow-up from #10

Once the GA data-retention setting is chosen, state the period on the privacy policy (`src/pages/privacy-policy.astro`, Analytics section).

## Follow-up from #11

Confirm GA works with no CSP violations (same listener approach as #12), since #11 could only check that the Google origins are in the policy, not that live GA works.

## Status

Done. Build config in `public-env/.env.production` (provider `gtag`, measurement ID `G-XMSE6Y7BFR`), explicit `page_location` without the URL fragment, GA admin checklist complete 2026-10-12, and retention (event data 2 months, user data 14 months) stated on the privacy policy. The deploy scan for `112b645` shows no `_ga*` cookies before a choice and no CSP violations with GA on. The scan blocks GA's `/collect` requests until there is a test property (#16).
