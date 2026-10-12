# Google Analytics property configuration

Last reviewed: 2026-10-12

Complete in ticket 14. Production builds already set `PUBLIC_ANALYTICS_PROVIDER=gtag`. Tick each item only once it's done in the account, record the date, and re-check at every quarterly review.

The registry calls Google Analytics a processor, so swapping or adding it doesn't ask visitors again. The first three items are what make that true; `node scripts/privacy-records-check.ts` fails, and blocks deploys, until they are ticked.

Status: production property set up 2026-10-12. Test property `G-RPVQBR9DFV` created 2026-10-12 for the privacy scan.

- [x] Accept Google's data processing terms in the GA account settings (Admin > Account settings > Data processing terms)
- [x] Data sharing settings all off (Admin > Account settings > Account details > Data sharing settings): Google products & services, Modeling contributions & business insights, Technical support, Recommendations for your business, Google sales experts, and any other option listed. With sharing on, Google uses the data for its own purposes and acts as a controller, not our processor
- [x] Requests to `https://www.google.com` checked: with analytics accepted, note which paths GA requests there (it's a registered origin found by the scan). An ads or audiences endpoint (such as `/ads/ga-audiences` or `/pagead/`) means Google is using the data for advertising as a controller: turn off what sends it and confirm the requests stop, or register Google Analytics as a controller. Checked 2026-10-11: the only path is `/g/collect`, GA's fallback copy of a hit when `google-analytics.com` fails; no ads or audiences endpoints with analytics accepted
- [x] Data retention set (Admin > Data collection and modification > Data retention): each setting is 2 or 14 months on a standard property; choose the shortest that still works
- [x] "Reset user data on new activity" turned off, so identifiers expire on schedule instead of being extended by each visit
- [x] Google Signals off in the property (the site's config also sets `allow_google_signals: false`)
- [x] Enhanced measurement off, or reviewed: it adds automatic events that are not in our event schema
- [x] Granular location and device data collection off, at least for the EEA and UK
- [x] No links to Google Ads or other Google products
- [x] No user-provided data collection
- [x] A separate test property exists for the privacy scan (ticket 16). `scripts/privacy-scan.ts` builds its own copy of the site with the test ID, so scan visits never reach production

Chosen retention (stated on the privacy policy, "How long we keep data"): event data 2 months, user data 14 months.
