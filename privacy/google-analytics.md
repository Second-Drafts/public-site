# Google Analytics property configuration

Last reviewed: 2026-10-11

Complete in ticket 14, before `PUBLIC_ANALYTICS_PROVIDER=gtag` is set for a production build. Tick each item and record the date; re-check at every quarterly review.

Status: not yet set up. **To fill:** date completed, property owner.

- [ ] Accept Google's data processing terms in the GA account settings (Admin > Account settings > Data processing terms)
- [ ] Data retention set to 14 months, the longest a standard property allows (the alternative is 2 months); choose the shortest that still works
- [ ] "Reset user data on new activity" turned off, so identifiers expire on schedule instead of being extended by each visit
- [ ] Google Signals off
- [ ] Granular location and device data collection off, at least for the EEA and UK
- [ ] No links to Google Ads or other Google products
- [ ] No user-provided data collection
- [ ] A separate test property exists for the privacy scan (ticket 12), with its own measurement ID that is never used in production builds

Chosen retention (state this on the privacy policy, Analytics section): **To fill**
