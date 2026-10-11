# Privacy records

Records that sit alongside the code. The registry (`src/lib/privacy/registry.ts`) is the source of truth for what the site stores and which vendors it contacts; these files hold what code can't: terms accepted, vendor settings, and the GDPR Art. 30 record of processing.

| File | What it is |
| --- | --- |
| `vendors.md` | One section per vendor in the registry: role, terms accepted, transfer mechanism, last reviewed |
| `google-analytics.md` | Property configuration checklist (ticket 14). The processor items (data processing terms, data sharing settings, `www.google.com` requests) gate deploys |
| `processing-record.md` | Art. 30 record of processing activities |
| `scan-report.json` | Written by `npm run privacy:scan` before every deploy and committed by `npm run deploy` once the site is published, so history shows what each release did |

A test (`src/lib/privacy/records.test.ts`) fails if a vendor in the registry has no section in `vendors.md`, if a section disagrees with the registry on role, transfer or privacy link, or if a "Last reviewed" date is missing or in the future.

## Registry changes

`npm run privacy:lock` asks TypeSafe's Jev model what the bump rules can't decide: whether reworded storage purposes or category descriptions describe a new use or a new recipient of the data, and whether a new analytics property could carry what a visitor wrote or identify them. Only registry and schema text is sent, never visitor data. Separately, whenever a vendor is added or its name, role or category changes, a person must check its role against the vendor's current terms. A wrong `processor` label is how a change could skip re-consent.

If anything needs a person (a Jev concern, a vendor role, or a question Jev couldn't answer), the script lists it with links, does not write the lock, and prints a code. Once you've checked each item, re-run with `-- --confirm=<code>`. The code covers exactly the items listed, so a different list needs a new code. The lock records how each change was reviewed in its `reviews` list: `clear` (Jev found nothing), `accepted` (Jev raised a concern and you accepted it), `checked-by-hand` (Jev couldn't run and you checked it) or `role-confirmed` (you checked a vendor's role). That list shows up in the commit diff. `-- --bump=minor|major` can still raise the proposed bump.

The script reads `TYPESAFE_API_KEY` through `op run` from a gitignored `.env` holding a 1Password reference: `TYPESAFE_API_KEY=op://<vault>/<item>/<field>`. Without that `.env` or the 1Password CLI, run `node scripts/privacy-lock.ts` directly. Every Jev question then falls to you, and confirming records `checked-by-hand`.

## Deploys

`npm run deploy` runs these before publishing, and stops at the first failure:

- `deploy:preflight`: deploy only from `main` with no uncommitted changes other than `scan-report.json`, so the build matches a commit.
- `privacy:records`: fails while a vendor registered as `role: "processor"` in a consent-requiring category has unticked items in its records, as listed in `PROCESSOR_RECORDS` (`src/lib/privacy/processor-records.ts`). Being a processor is what lets the lock treat a new or swapped vendor as a minor change. Tick the items only once they're done in the vendor's account, or register the vendor as a controller.
- Lint, tests, build, then `privacy:scan`: in every consent state, nothing unregistered is stored or contacted, and text a visitor writes never reaches a request, the URL outside `#`, the page title, the console, a page error or analytics page parameters. Each tool visitors write in is listed in `TOOLS_VISITORS_WRITE_IN` in `scripts/privacy-scan.ts`; add new tools there.

After publishing, the gh-pages commit is named after the source commit, and the scan report (which records `sourceCommit`) is committed on `main`. Run `git push` afterwards.

## Privacy reviewer agent

The checks above cover registry, analytics and leak changes. For the rest (a new tool's consent wiring, policy promises, and data changes shipping without their policy), run the `privacy-reviewer` agent in `.claude/agents/` on diffs that add a tool or edit the policies, banner or these records.

## Quarterly review

Every three months, in one commit:

1. Re-read `vendors.md`, `google-analytics.md` and `processing-record.md` against how the site works now.
2. Check each vendor's current terms and privacy statement, and whether its EU–US Data Privacy Framework certification is still active (https://www.dataprivacyframework.gov/list).
3. Check the Google Analytics property still matches `google-analytics.md`.
4. Skim `privacy/scan-report.json` for anything unexpected.
5. Update each file's "Last reviewed" date. If a registry fact changed, run `npm run privacy:lock` and follow the bump rules.

The recurring calendar event for this review is set up by the owners; it is not automated in the repo.

Not legal advice: have the policy text and these records reviewed by someone qualified before relying on them.
