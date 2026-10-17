# 34 · Turn on enhanced measurement and describe events by category

**Depends on:** #14

## Why

`privacy/google-analytics.md` kept enhanced measurement off because it adds automatic events that weren't in our event schema, and the privacy policy promised "The exact events we send". GDPR and ePrivacy require us to describe the categories of data we collect and why, not to list every event name. The exact list was a choice we made, and it blocked a feature we want.

Enhanced measurement is configured in the GA admin, not in code, so without a guard nothing would notice a toggle being flipped there.

## What

1. Declare the events Google sends itself in `AUTOMATIC_EVENT_SCHEMA` (`src/lib/analytics/events.ts`), separate from `EVENT_SCHEMA` so `track()` can't send them. Lock both together (`LOCKED_ANALYTICS_SCHEMA`), so the lock's bump rules and Jev review them like our own events.
2. The privacy scan fails on any `/g/collect` hit whose event name isn't in the lock, both on page scans and on the tool runs that type the sentinel. It scrolls each page to the bottom so `scroll` is exercised. GA holds hits for about five seconds, so the scan hides the page before reading requests, which makes GA send them as it would when a visitor leaves.
3. Remove "The exact events we send" from the privacy policy. Describe the automatic events in plain language in the Analytics section.
4. Update `privacy/google-analytics.md`, `privacy/vendors.md` and `privacy/processing-record.md`.
5. In the GA admin, set enhanced measurement the same on the production and test properties: scrolls, outbound clicks, form interactions, site search, video engagement and file downloads on, and history-based page views off.

## Acceptance criteria

- [x] Automatic events declared and locked (minor bump, no re-consent: the purpose is unchanged).
- [x] Scan rejects undeclared analytics events.
- [x] The privacy policy describes events by category, with no exact event list.
- [x] Records in `privacy/` match the policy and the lock.
- [x] Enhanced measurement set in both properties, and its checklist item in `privacy/google-analytics.md` ticked with the date.
- [x] `npm run privacy:scan` passes with the toggles on, and the accepted state's hits include `scroll`.
- [x] History page views off: the tag served for both properties shows `"vtp_enableHistoryEvents":false`.
- [x] User-provided data collection off for both properties, including automatic detection in each Google tag's settings.

## Findings along the way

- Before the scan hid the page, it read requests about 300ms after each flow, while GA sends batched hits after about five seconds. Most analytics hits, including the tools' own events, never reached its sentinel and declaration checks. With the flush, a scan whose lock had every event removed reported `scroll` on all 13 pages, plus `user_engagement`, `m8_shaken`, `da_*`, `tp_*`, `wc_target_set` and `ws_sprint_started`. The real scan still passes, so none of those hits carried visitor text.
- After history events were unticked in the admin, the tag served for both properties still has `"vtp_enableHistoryEvents":true`. It changed to `false` later the same day, so admin changes take a while to reach the served tag.
- The served tag also includes `__ogt_1p_data_v2` with automatic email, phone and address detection, although user-provided data collection was off in both properties: automatic detection is a separate switch in each Google tag's settings. A probe that typed an email address and phone number into the Magic 8 Ball question sent nothing email- or phone-like to Google. The switch was turned off on both tags the same day, and the served tags now show `"vtp_isAutoEnabled":false`.

## Outcome

Enhanced measurement is on in both properties (2026-10-16), with history page views off. `AUTOMATIC_EVENT_SCHEMA` declares the events Google sends itself. `LOCKED_ANALYTICS_SCHEMA` locks them with the site's own events, rather than in a separate section of the lock, so the bump rules, Jev and the scan treat them the same (lock 2.6.0, minor). Jev's flags on `form_submit_text`, `search_term`, `file_name` and `video_title` were checked against the code and accepted. The privacy policy now describes the automatic events in plain language instead of listing every event. The scan rejects undeclared events and flushes GA's batched hits before reading requests.

Follow-ups from the privacy review, done the next day:
- The cookie policy mentions scroll depth and outbound clicks.
- The review suggested site search couldn't collect terms because `page_location` has no query string. A probe showed it does: GA reads the real page URL, and `/blog/?q=probe-search-term` sent `ep.search_term=probe-search-term`. The site has no search, so site search is now off on both streams and `view_search_results` is removed from the lock (2.7.0, minor). The scan loads `/blog/?q=scan-search-query` and fails if it comes back on. The privacy reviewer agent asks about turning it back on whenever a diff adds site search.
- The scan report records the analytics event names each page sent.
