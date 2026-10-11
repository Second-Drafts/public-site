# Privacy records

Records that sit alongside the code. The registry (`src/lib/privacy/registry.ts`) is the source of truth for what the site stores and which vendors it contacts; these files hold what code can't: terms accepted, vendor settings, and the GDPR Art. 30 record of processing.

| File | What it is |
| --- | --- |
| `vendors.md` | One section per vendor in the registry: role, terms accepted, transfer mechanism, last reviewed |
| `google-analytics.md` | Property configuration checklist, completed when Google Analytics is turned on (ticket 14) |
| `processing-record.md` | Art. 30 record of processing activities |
| `scan-report.json` | Written by `npm run privacy:scan` before every deploy and committed by `npm run deploy` once the site is published, so history shows what each release did |

A test (`src/lib/privacy/records.test.ts`) fails if a vendor in the registry has no section in `vendors.md`, if a section disagrees with the registry on role, transfer or privacy link, or if a "Last reviewed" date is missing or in the future.

## Quarterly review

Every three months, in one commit:

1. Re-read `vendors.md`, `google-analytics.md` and `processing-record.md` against how the site works now.
2. Check each vendor's current terms and privacy statement, and whether its EU–US Data Privacy Framework certification is still active (https://www.dataprivacyframework.gov/list).
3. Check the Google Analytics property still matches `google-analytics.md`.
4. Skim `privacy/scan-report.json` for anything unexpected.
5. Update each file's "Last reviewed" date. If a registry fact changed, run `npm run privacy:lock` and follow the bump rules.

The recurring calendar event for this review is set up by the owners; it is not automated in the repo.

Not legal advice: have the policy text and these records reviewed by someone qualified before relying on them.
