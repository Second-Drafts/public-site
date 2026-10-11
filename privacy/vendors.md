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

- **What it does for us:** Measures which tools and settings people use, only after the visitor accepts analytics.
- **Data involved:** The events and session properties listed on the privacy policy, plus what Google collects automatically (IP address, browser details), and the `_ga` and `_ga_<ID>` cookies. Never the text of a script.
- **Role:** processor, once Google's data processing terms are accepted in the account (see `google-analytics.md`).
- **Terms accepted:** Google Analytics data processing terms. **To fill:** date accepted (done in ticket 14; not yet turned on).
- **Transfer mechanism:** EU–US Data Privacy Framework.
- **Privacy terms:** https://policies.google.com/privacy
- **Retention:** Chosen in the property settings (2 or 14 months for standard properties); recorded in `google-analytics.md` and then stated on the privacy policy.
