# Vendors

One section per vendor in `VENDORS` (`src/lib/privacy/registry.ts`). The heading is the vendor's `name` exactly. Add a section when a vendor is added, such as an email provider.

Fields marked **To fill** need a date or detail only the account owner knows.

## GitHub Pages

Last reviewed: 2026-10-11

- **What it does for us:** Hosts and serves the static site.
- **Data involved:** The visitor's IP address, browser details, referring site and pages requested, logged by GitHub. We don't receive these logs.
- **Role:** controller. GitHub's general privacy statement says GitHub acts as data controller and logs IP address and session details for safety, security and keeping the service running. It doesn't mention Pages specifically, so this is an inference; recheck at each review.
- **Terms accepted:** GitHub Terms of Service. **To fill:** date accepted.
- **Transfer mechanism:** EU–US Data Privacy Framework. GitHub also says it generally relies on the standard contractual clauses (Commission Implementing Decision 2021/914) for transfers to countries without an adequacy decision.
- **Privacy terms:** https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- **Retention:** GitHub gives no specific period for these logs.

## Google Analytics

Last reviewed: 2026-10-11

- **What it does for us:** Measures which pages, tools and settings people use, only after the visitor accepts analytics. Every page loads it once accepted; only the teleprompter sends tool events today.
- **Data involved:** The events and session properties listed on the privacy policy (tool settings, text length as a word-count range, how the visitor arrived, time spent, device type), plus what Google collects automatically (IP address, browser details), and the `_ga` and `_ga_<ID>` cookies. Never the text a visitor writes in any tool.
- **Role:** processor, which the registry records and which lets a processor change skip re-consent. That holds only while Google's data processing terms are accepted, every Data sharing setting is off and no request goes to an ads or audiences endpoint; otherwise Google uses the data for its own purposes and is a controller. Those items are in `google-analytics.md`, and `scripts/privacy-records-check.ts` blocks deploys until they are ticked. Not yet confirmed.
- **Terms accepted:** Google Analytics data processing terms, recorded 2026-10-11 in `google-analytics.md`.
- **Transfer mechanism:** EU–US Data Privacy Framework.
- **Privacy terms:** https://policies.google.com/privacy
- **Retention:** Event data 2 months, user data 14 months (property settings, recorded in `google-analytics.md`); stated on the privacy policy.

## Cloudflare

Last reviewed: 2026-10-18

- **What it does for us:** Runs the forms Worker (`workers/forms`, served at `https://forms.seconddrafts.workers.dev`) and stores what visitors send through our forms, such as waitlist signups and survey answers, in a D1 database created in the `eu` jurisdiction.
- **Data involved:** What a visitor submits: email address, which form and feature it came from, the options ticked, answers to optional questions and the time sent. Cloudflare also sees the visitor's IP address and browser details while handling the request; the Worker uses the IP only for its rate limit and never stores it, and Workers observability (request logs) is turned off in `wrangler.jsonc`.
- **Role:** processor. Cloudflare's Data Processing Addendum covers customer content stored on its services and applies to self-serve accounts through the subscription agreement. Recheck at each review that it still applies to the Free plan.
- **Terms accepted:** Cloudflare Self-Serve Subscription Agreement and its Data Processing Addendum, accepted with the account (founders@seconddrafts.com) on 2026-10-16.
- **Transfer mechanism:** EU–US Data Privacy Framework. Stored data stays in the EU through the D1 jurisdiction, but each request is handled at the nearest Cloudflare location, which may be outside the EU. The framework covers that and any access from the US, and the addendum also includes the standard contractual clauses.
- **Privacy terms:** https://www.cloudflare.com/privacypolicy/
- **Retention:** What we store, we delete as the privacy policy says: an email once we've sent what the visitor asked for or when they ask to be removed, answers after 12 months. We turn off Workers observability, so we hold no request logs; Cloudflare keeps its own operational and security logs under its privacy policy.
