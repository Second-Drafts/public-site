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

- [ ] GA checklist complete and dated.
- [ ] Scan passes with the real GA test property and `registry.lock.json` is unchanged.
- [ ] Production deploy with GA on; a fresh visit sets no `_ga*` cookies until Accept.

## Follow-up from #10

Once the GA data-retention setting is chosen, state the period on the privacy policy (`src/pages/privacy-policy.astro`, Analytics section).

## Follow-up from #11

Confirm GA works with no CSP violations (same listener approach as #12), since #11 could only check that the Google origins are in the policy, not that live GA works.

## Status

Done in code: build config in `public-env/.env.production` (provider `gtag`, measurement ID `G-XMSE6Y7BFR`), explicit `page_location` without the URL fragment, scan passes with GA on, and `https://www.google.com` was added to the registry (found by the scan; minor bump to 1.2.0, no re-consent). Because there is no test property yet, the scan blocks GA's `/collect` requests (see #16).

Still to do:

- [ ] GA admin checklist in `privacy/google-analytics.md`, with the date
- [ ] State the chosen GA data retention on the privacy policy (Analytics section) and in `google-analytics.md`
- [ ] Production deploy, then check a fresh visit sets no `_ga*` cookies until Accept
