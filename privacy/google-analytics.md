# Google Analytics property configuration

Last reviewed: 2026-10-11

Complete in ticket 14. Production builds already set `PUBLIC_ANALYTICS_PROVIDER=gtag`. Tick each item only once it's done in the account, record the date, and re-check at every quarterly review.

The registry calls Google Analytics a processor, so swapping or adding it doesn't ask visitors again. The first three items are what make that true; `node scripts/privacy-records-check.ts` fails, and blocks deploys, until they are ticked.

Status: not yet set up. **To fill:** date completed, property owner.

- [ ] Accept Google's data processing terms in the GA account settings (Admin > Account settings > Data processing terms)
- [ ] Data sharing settings all off (Admin > Account settings > Account details > Data sharing settings): Google products & services, Modeling contributions & business insights, Technical support, Recommendations for your business, Google sales experts, and any other option listed. With sharing on, Google uses the data for its own purposes and acts as a controller, not our processor
- [ ] Requests to `https://www.google.com` checked: with analytics accepted, note which paths GA requests there (it's a registered origin found by the scan). An ads or audiences endpoint (such as `/ads/ga-audiences` or `/pagead/`) means Google is using the data for advertising as a controller: turn off what sends it and confirm the requests stop, or register Google Analytics as a controller
- [ ] Data retention set to 14 months, the longest a standard property allows (the alternative is 2 months); choose the shortest that still works
- [ ] "Reset user data on new activity" turned off, so identifiers expire on schedule instead of being extended by each visit
- [ ] Google Signals off in the property (the site's config also sets `allow_google_signals: false`)
- [ ] Enhanced measurement off, or reviewed: it adds automatic events that are not in our event schema
- [ ] Granular location and device data collection off, at least for the EEA and UK
- [ ] No links to Google Ads or other Google products
- [ ] No user-provided data collection
- [ ] A separate test property exists for the privacy scan (ticket 16). Until then the scan blocks GA's collect requests so it never sends hits to production

Chosen retention (state this on the privacy policy, Analytics section): **To fill**
