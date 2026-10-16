# Record of processing activities (GDPR Art. 30)

Last reviewed: 2026-10-13

**Controller:** The Department of Second Drafts, seconddrafts.com. Contact: privacy@seconddrafts.com. **To fill:** registered entity name and postal address (the address is still a placeholder in `src/lib/privacy/organisation.ts`).

No data protection officer has been appointed. **To fill:** confirm whether one is required.

Common to all activities: data is protected in transit by HTTPS (GitHub Pages), the site sets no first-party cookies, text a visitor writes in any tool (as opposed to a form they choose to send) stays on their device (the teleprompter, word counter and writing sprint keep it in the browser's local storage, and the teleprompter also puts it after the `#` of share links, which browsers never send to a server), and analytics only runs after consent.

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
- **Data categories:** Events and session properties as listed on the privacy policy (pages visited, tool settings, text length as a word-count range, time spent, landing source, referrer domain, device type), plus IP address and browser details collected by Google, and the `_ga` / `_ga_<ID>` identifiers. Every page sends a page view; the teleprompter, word counter and writing sprint send tool events. Never the text a visitor writes in any tool.
- **Data subjects:** Visitors who accept analytics.
- **Recipients:** Google Analytics (processor, once the processor items in `google-analytics.md` are ticked; deploys are blocked until then).
- **Transfers:** To the United States under the EU–US Data Privacy Framework.
- **Retention:** Cookies last up to 24 months; GA keeps event data 2 months and user data 14 months (see `google-analytics.md`).
- **Security measures:** Loaded only after consent; no data collected when consent is refused or withdrawn, or when Global Privacy Control is on; origins limited by the Content Security Policy.
- **Legal basis:** Consent (Art. 6(1)(a), and ePrivacy Art. 5(3) for the cookies).

## Waitlists and forms

Forms in use: the Continuity Checker waitlist and survey, and the teleprompter's coming-soon features. Add a line here when a form is added. The privacy policy covers forms in general, so a new form needs no policy change unless it introduces a new kind of purpose.

- **Purpose:** Each form states its own purpose, and each is consented to separately. The kinds of purpose are: (1) emailing the visitor about the specific tool or feature they asked about, such as when it launches; (2) inviting them to try an early version, only if they tick that option; (3) reading their answers to optional questions to decide what to build.
- **Data categories:** Email address; which form and feature the signup came from; the options ticked; the time sent; answers to optional questions. These may include free text about the visitor's own writing, possibly quoting it. No IP address is stored.
- **Data subjects:** Visitors who send a form.
- **Recipients:** Cloudflare (processor), which stores submissions in a D1 database restricted to the EU jurisdiction and sees the IP address in transit for rate limiting. Our email provider, when we send. Nobody else.
- **Transfers:** Stored in the EU. Cloudflare is a US company, so any access from the US falls under the EU–US Data Privacy Framework.
- **Retention:** An email address is kept until we've sent what the visitor asked for, or until they ask to be removed, whichever comes first. Answers to optional questions are deleted 12 months after submission.
- **Security measures:** HTTPS. The Worker accepts requests only from seconddrafts.com, with a honeypot field and a rate limit. Data is reachable only through our Cloudflare account. The pre-deploy privacy scan checks that form values reach only our Worker. Analytics never carries form values or email addresses.
- **Legal basis:** Consent (Art. 6(1)(a)), given separately for each form and each option. Withdrawn by replying to any email or writing to privacy@seconddrafts.com.

## Not yet in use

Add an entry here before launching any of these, together with its vendor section in `vendors.md`:
- Sign-in and payments (see ticket 15)
