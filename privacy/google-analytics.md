# Google Analytics property configuration

Last reviewed: 2026-10-16

Complete in ticket 14. Production builds already set `PUBLIC_ANALYTICS_PROVIDER=gtag`. Tick each item only once it's done in the account, record the date, and re-check at every quarterly review.

The registry calls Google Analytics a processor, so swapping or adding it doesn't ask visitors again. The first three items are what make that true; `node scripts/privacy-records-check.ts` fails, and blocks deploys, until they are ticked.

Status: production property set up 2026-10-12. Test property `G-RPVQBR9DFV` created 2026-10-12 for the privacy scan.

- [x] Accept Google's data processing terms in the GA account settings (Admin > Account settings > Data processing terms)
- [x] Data sharing settings all off (Admin > Account settings > Account details > Data sharing settings): Google products & services, Modeling contributions & business insights, Technical support, Recommendations for your business, Google sales experts, and any other option listed. With sharing on, Google uses the data for its own purposes and acts as a controller, not our processor
- [x] Requests to `https://www.google.com` checked: with analytics accepted, note which paths GA requests there (it's a registered origin found by the scan). An ads or audiences endpoint (such as `/ads/ga-audiences` or `/pagead/`) means Google is using the data for advertising as a controller: turn off what sends it and confirm the requests stop, or register Google Analytics as a controller. Checked 2026-10-11: the only path is `/g/collect`, GA's fallback copy of a hit when `google-analytics.com` fails; no ads or audiences endpoints with analytics accepted
- [x] Data retention set (Admin > Data collection and modification > Data retention): each setting is 2 or 14 months on a standard property; choose the shortest that still works
- [x] "Reset user data on new activity" turned off, so identifiers expire on schedule instead of being extended by each visit
- [x] Google Signals off in the property (the site's config also sets `allow_google_signals: false`)
- [x] Enhanced measurement reviewed (ticket 34) 2026-10-16, set the same on the production and test properties (Admin > Data streams > Enhanced measurement): scrolls, outbound clicks, form interactions, video engagement and file downloads on; site search **off** (the site has no search, and GA reads the real page URL, so any link with `?q=`, `?s=`, `?search=`, `?query=` or `?keyword=` would send that value as a search term; the scan loads `/blog/?q=…` and fails if it does); page views on but **"Page changes based on browser history events" off**, since the site sends its own `page_view` without the URL fragment and the hand-off flows call `history.replaceState`. Their events are declared in `AUTOMATIC_EVENT_SCHEMA` (`src/lib/analytics/events.ts`) and the lock, and the privacy scan fails on any event reaching Google that isn't. A newly enabled toggle needs its events declared first. Confirmed 2026-10-16 in the tag served for both properties (`https://www.googletagmanager.com/gtag/js?id=<ID>`): `"vtp_enableHistoryEvents":false`. Admin changes took a while to reach the served tag
- [x] Granular location and device data collection off, at least for the EEA and UK
- [x] No links to Google Ads or other Google products, except Search Console (see below)
- [x] No user-provided data collection, in the property (Admin > Data collection) and in each Google tag's settings, where automatic detection of emails, phone numbers and addresses is a separate switch. Confirmed 2026-10-16 in the tag served for both properties: `__ogt_1p_data_v2` shows `"vtp_isAutoEnabled":false` and `"vtp_isManualEnabled":false`, and on 2026-10-17 `"vtp_isEnabled":false`
- [x] A separate test property exists for the privacy scan (ticket 16). `scripts/privacy-scan.ts` builds its own copy of the site with the test ID, so scan visits never reach production

Search Console link: `sc-domain:seconddrafts.com` linked to the property to evaluate the joined reports. The link is two-way: Search Console data is exported into GA under the GA terms, and GA data is imported into Search Console under the Search Console terms, so GA-derived data reaches a product the data processing terms don't cover. We judge it aggregate and not personal data, and the privacy policy says so. Unlink it in Admin > Product links > Search Console links if the reports aren't useful. Re-run `npm run privacy:scan` after linking and expect no new origins, cookies or requests.

Chosen retention (stated on the privacy policy, "How long we keep data"): event data 2 months, user data 14 months.
