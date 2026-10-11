# 10 · Privacy policy page

**Depends on:** #01, #08 (for the analytics description)
**Part of:** #00

## Why

The cookie policy defers to a privacy policy for legal bases, sharing, transfers and rights, and that page doesn't exist yet. Some processing isn't about cookies at all, for example hosting logs.

## What

Create `src/pages/privacy.astro`, covering:

- **Who we are** and how to contact us.
- **Hosting:** GitHub Pages serves the site, and GitHub processes visitor IP addresses (for security and operations, per GitHub's privacy statement). Legal basis: legitimate interest.
- **Analytics:** Google Analytics, consent-based. What's collected (from the event schema, #08), retention (the GA data-retention setting from #13), and Google as processor.
- **International transfers:** EU–US Data Privacy Framework for Google. Check the current status when writing; it can change.
- **What we don't do:** no accounts, no advertising, no selling data, script text never leaves your device (once #12 proves it).
- **Your rights** (access, deletion, objection, complaint to a supervisory authority) and how to exercise them. Be honest that GA data can't easily be tied to a person who asks.
- **Future email signups:** `interest.ts` has a stubbed signup. When it's built, the email provider is a new processor and this page and #13 must change in the same release.
- **Changes** and a "Last updated" date.

Generate the vendor list from `VENDORS` where it makes sense, so a new vendor shows up here as well as in the cookie policy.

## Acceptance criteria

- [ ] `/privacy` is live and linked from the footer, banner and cookie policy.
- [ ] Every vendor in the registry appears on the page.
- [ ] GitHub Pages hosting is disclosed.
- [ ] Reviewed by someone qualified before relying on it.
