# Record of processing activities (GDPR Art. 30)

Last reviewed: 2026-10-11

**Controller:** The Department of Second Drafts, seconddrafts.com. **To fill:** registered entity name, postal address and contact email (placeholders live in `src/lib/privacy/organisation.ts`).

No data protection officer has been appointed. **To fill:** confirm whether one is required.

Common to all activities: data is protected in transit by HTTPS (GitHub Pages), the site sets no first-party cookies, scripts a visitor writes stay on their device, and analytics only runs after consent.

## Hosting the website

- **Purpose:** Delivering the site and keeping it secure.
- **Data categories:** IP address, browser and device details, pages requested, referring site, time of visit.
- **Data subjects:** Visitors to the site.
- **Recipients:** GitHub Pages (controller of its own logs). We don't receive the logs.
- **Transfers:** To the United States under the EU–US Data Privacy Framework.
- **Retention:** Set by GitHub; no period published.
- **Security measures:** HTTPS; Content Security Policy generated from the vendor registry; pre-deploy privacy scan.
- **Legal basis:** Legitimate interest (Art. 6(1)(f)): a website can't be delivered or protected without this.

## Website analytics

- **Purpose:** Understanding which tools and settings people use so we know what to improve.
- **Data categories:** Events and session properties as listed on the privacy policy (tool settings, script length range, landing source, referrer domain, device type), plus IP address and browser details collected by Google, and the `_ga` / `_ga_<ID>` identifiers. Never script text.
- **Data subjects:** Visitors who accept analytics.
- **Recipients:** Google Analytics (processor).
- **Transfers:** To the United States under the EU–US Data Privacy Framework.
- **Retention:** Cookies last up to 24 months; analytics data kept for the property's configured retention (see `google-analytics.md`).
- **Security measures:** Loaded only after consent; no data collected when consent is refused or withdrawn, or when Global Privacy Control is on; origins limited by the Content Security Policy.
- **Legal basis:** Consent (Art. 6(1)(a), and ePrivacy Art. 5(3) for the cookies).

## Not yet in use

Add an entry here before launching any of these, together with its vendor section in `vendors.md`:

- Email signup (disabled; `EMAIL_CAPTURE_ENABLED` must stay false until then)
- Sign-in and payments (see ticket 15)
