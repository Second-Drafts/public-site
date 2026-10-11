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

- **What it does for us:** Measures which tools and settings people use, only after the visitor accepts analytics. Only the teleprompter loads it today; the word counter sends nothing.
- **Data involved:** The events and session properties listed on the privacy policy (tool settings, text length as a word-count range, how the visitor arrived, time spent, device type), plus what Google collects automatically (IP address, browser details), and the `_ga` and `_ga_<ID>` cookies. Never the text a visitor writes in any tool.
- **Role:** processor, which the registry records and which lets a processor change skip re-consent. That holds only while Google's data processing terms are accepted, every Data sharing setting is off and no request goes to an ads or audiences endpoint; otherwise Google uses the data for its own purposes and is a controller. Those items are in `google-analytics.md`, and `scripts/privacy-records-check.ts` blocks deploys until they are ticked. Not yet confirmed.
- **Terms accepted:** Google Analytics data processing terms. **To fill:** date accepted (ticket 14; production builds already enable GA, so deploys are blocked until this is done).
- **Transfer mechanism:** EU–US Data Privacy Framework.
- **Privacy terms:** https://policies.google.com/privacy
- **Retention:** Chosen in the property settings (2 or 14 months for standard properties); recorded in `google-analytics.md` and then stated on the privacy policy.
