# 00 · Privacy and consent system (overview)

Child tickets: 01–14, 16.

## Goal

Keep our cookie policy, ePrivacy/GDPR consent and record keeping correct **by construction**, so two people can keep it up to date without a paid consent-management service. Facts about what the site stores and who it talks to are written down once, in code, and everything else (the policy table, the CSP, consent purges, CI checks) is generated or checked from them.

This is pre-work for adding Google Analytics (or another analytics provider). Google Analytics is treated as already present from the start: it is in the registry, the policy, the CSP and the scans. Turning it on (#14) should then be a configuration change, not a policy change.

## Constraints that shape the design

- The site is static Astro on GitHub Pages: no server, no response headers, no server-side consent log.
- Deploys run from a laptop via `npm run deploy` (`predeploy` builds first). That hook is where checks run.
- localStorage and sessionStorage count the same as cookies under ePrivacy Art. 5(3). The site currently sets **no** first-party cookies.
- Third-party scripts (GA's `gtag.js`) set their own cookies (`_ga`, `_ga_<ID>`) without going through our code. Those are controlled by gating *script loading*, not storage access.
- A request to a third-party origin sends the visitor's IP even with no cookies (a GDPR data transfer), so third-party *origins* are part of the inventory too.

## Architecture: one registry, several enforcement layers

| Layer | What it catches | Ticket |
|---|---|---|
| Registry of categories, vendors and storage keys | The single source of truth | #01 |
| Consent-aware storage interface | First-party writes in a category without consent become no-ops | #02 |
| Lint rule against direct storage access | First-party code bypassing the interface | #03 |
| Consent state + `whenGranted` gate | Third-party scripts loading without consent | #04, #05 |
| Registry lock file with derived version | Disclosure changes that nobody noticed; triggers re-consent | #07, #08 |
| Generated policy table and "Last updated" | Policy drifting from reality | #09 |
| CSP generated from registry origins | Any page contacting an unregistered vendor | #11 |
| Browser scan before every deploy | Ground truth: everything the shipped site actually stores or contacts | #12 |

## Principles

- **Define errors out of existence.** Callers never check consent; the storage interface and `whenGranted` do. Nobody remembers to bump a version; the lock file derives it.
- **Two categories only:** `necessary` and `analytics`. Saving a user's script, settings and dismissed hints is strictly necessary for a feature they asked for. Add a category only when a real key needs one; every category is another banner toggle.
- **Opt-in for everyone.** A static site can't reliably tell where a visitor is, so the banner is shown to everyone and no per-jurisdiction logic exists.
- **Git is the audit trail.** The registry, lock file, banner copy and scan reports are committed, so the state at any past date can be reconstructed.

## Order

- 01 → 02 → 03
- 02 → 04 → 05 and 06
- 01 → 07 → 08
- 09 needs 06 and 07; 10 needs 08
- 11 needs only 01; 13 can start any time
- 12 needs 04–06
- 14 is last

Not legal advice: have the policy text (#09, #10) reviewed before relying on it.

## Outcome

All child tickets are done. Google Analytics runs in production behind consent (#14), and the privacy scan checks every deploy against a separate GA test property (#16). Privacy for sign-in and payments continues in #15.
