# 34 · Turn on enhanced measurement and describe events by category

**Depends on:** #14

## Why

`privacy/google-analytics.md` keeps enhanced measurement off because it adds automatic events that aren't in our event schema, and the privacy policy promises "The exact events we send". GDPR and ePrivacy require us to describe the categories of data we collect and why, not to list every event name. The exact list is a choice we made, and it blocks a feature we want.

## What

1. Decide which enhanced measurement toggles to turn on (page views, scrolls, outbound clicks, site search, video engagement, file downloads, form interactions). Turn on only the ones that tell us something our own events don't.
2. Enable them in the production property (Admin > Data streams > Enhanced measurement) and in the test property used by the privacy scan.
3. Rewrite the Analytics section of `src/pages/privacy-policy.astro`. Remove "The exact events we send" and its list. Describe our events and the enabled automatic events by category in plain language, such as which tools and settings people use, how far down a page they scroll, and which outbound links and downloads they use.
4. Remove `analyticsEvents()` and `sessionContextProperties()` from `privacyPolicyModel` if nothing else uses them. Keep the event schema in `registry.lock.json`; it still guards what the code can send.
5. Update `privacy/google-analytics.md` (the enhanced measurement item should list which toggles are on and why), `privacy/vendors.md` and `privacy/processing-record.md` (data categories).
6. Run `npm run privacy:lock` and follow the bump rules. New automatic events may count as a change to the data categories, so check whether re-consent is needed before deploying.
7. Run `npm run privacy:scan` with analytics accepted. Confirm the new events show only on `google-analytics.com` or `www.google.com` requests, with no new cookies or origins, and that no text a visitor writes appears in any request (the scan's `TOOLS_VISITORS_WRITE_IN` check). Enhanced measurement events such as `form_start`, `form_submit` and `view_search_results` can include form field names and search terms, so check these against the tools that take writing.

## Acceptance criteria

- [ ] Only the chosen enhanced measurement toggles are on, in both properties.
- [ ] The privacy policy describes events by category, with no exact event list.
- [ ] Records in `privacy/` match the property and the policy, with dates.
- [ ] `npm run privacy:lock` run, and re-consent decision recorded.
- [ ] Scan passes with analytics accepted and nothing unregistered.
