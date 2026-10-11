# 13 · Vendor and processing records

**Depends on:** —
**Part of:** #00

## Why

Some obligations don't live in code: processor agreements, vendor settings, and a record of processing activities (GDPR Art. 30). The small-company exemption is unlikely to apply because analytics runs all the time, not occasionally. With two people, these need to be in the repo where they'll be seen, with dates that show when they go stale.

## What

Create a root `privacy/` folder (it will also hold the scan report from #12):

- **`privacy/vendors.md`:** one section per vendor (Google Analytics, GitHub Pages; later the email provider). Confirm the `role` and `transfer` that #01 drafted for each vendor in `VENDORS` against the vendor's current terms, especially GitHub Pages' `controller` role, and fix the registry if they're wrong. For each: what it does for us, data involved, role (processor or controller), contract or terms accepted and when, transfer mechanism, link to their privacy terms, **last reviewed** date.
- **`privacy/google-analytics.md`:** the GA property configuration checklist, to complete in #14:
  - Accept Google's data processing terms in the GA account settings
  - Data retention set to the shortest that works (GA4 offers 2 or 14 months)
  - Google Signals off
  - Granular location and device data collection off, at least for the EEA and UK
  - No links to Google Ads or other Google products
  - No user-provided data collection
  - Separate test property for the scan (#12)
- **`privacy/processing-record.md`:** the Art. 30 record, one entry per processing activity (hosting logs, analytics, later email signups). Each entry has purpose, data categories, data subjects, recipients, transfers, retention, security measures and legal basis. Generate the vendor and retention parts from the registry if that turns out to be easy; otherwise keep it short and reviewed.
- **Review cadence:** a quarterly review of these three files, the vendors' current terms, and the DPF status. Set up a recurring reminder (for example a scheduled task) and record each review by updating the "last reviewed" dates in a commit.

## Acceptance criteria

- [ ] `privacy/vendors.md`, `privacy/google-analytics.md` and `privacy/processing-record.md` exist and cover GitHub Pages and Google Analytics.
- [ ] Every vendor in `VENDORS` has a section in `vendors.md` (a unit test can check the headings).
- [ ] A recurring quarterly review reminder exists.
