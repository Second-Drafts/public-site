# Record of processing activities (GDPR Art. 30)

Last reviewed: 2026-10-13

**Controller:** The Department of Second Drafts, seconddrafts.com. Contact: privacy@seconddrafts.com. **To fill:** registered entity name and postal address (the address is still a placeholder in `src/lib/privacy/organisation.ts`).

No data protection officer has been appointed. **To fill:** confirm whether one is required.

Common to all activities: data is protected in transit by HTTPS (GitHub Pages), the site sets no first-party cookies, text a visitor writes in any tool stays on their device (the teleprompter, word counter and writing sprint keep it in the browser's local storage, and the teleprompter also puts it after the `#` of share links, which browsers never send to a server; the Magic 8 Ball keeps its optional question in memory only, and draws it onto an answer image only when the visitor chooses to copy, share or download it), motion-sensor readings the Magic 8 Ball uses to notice a phone shake never leave the page, and analytics only runs after consent.

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
- **Data categories:** Events and session properties as recorded in `src/lib/privacy/registry.lock.json` (pages visited, tool settings, text length as a word-count range, time spent, landing source, referrer domain, device type), plus IP address and browser details collected by Google, and the `_ga` / `_ga_<ID>` identifiers. Every page sends a page view; the teleprompter, word counter, writing sprint, draft analysis and Magic 8 Ball send tool events. The Magic 8 Ball's say how a shake was triggered, which answer deck was used, whether a question was typed (yes or no), whether a shake came too soon, how an answer image was shared, and whether motion access was allowed. Google's enhanced measurement adds scroll depth, outbound link clicks, form starts and submits (form id, name, destination and submit-button text, never field values), file downloads and video plays; the site has no video or tracked file types today. Site search measurement is off. Never the text a visitor writes in any tool.
- **Data subjects:** Visitors who accept analytics.
- **Recipients:** Google Analytics (processor, once the processor items in `google-analytics.md` are ticked; deploys are blocked until then).
- **Transfers:** To the United States under the EU–US Data Privacy Framework.
- **Retention:** Cookies last up to 24 months; GA keeps event data 2 months and user data 14 months (see `google-analytics.md`).
- **Security measures:** Loaded only after consent; no data collected when consent is refused or withdrawn, or when Global Privacy Control is on; origins limited by the Content Security Policy.
- **Legal basis:** Consent (Art. 6(1)(a), and ePrivacy Art. 5(3) for the cookies).

## Not yet in use

Add an entry here before launching any of these, together with its vendor section in `vendors.md`:

- Email signup (disabled; `EMAIL_CAPTURE_ENABLED` must stay false until then)
- Sign-in and payments (see ticket 15)
