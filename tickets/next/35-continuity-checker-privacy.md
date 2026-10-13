# 35 · Privacy for the Continuity Checker

**Depends on:** the Continuity Checker build (not yet ticketed)
**Part of:** — (follows #33)

## Why

The Continuity Checker has to send a writer's manuscript to Anthropic's API to check it. That breaks promises the site makes today: "We don't receive what you write" (`src/pages/privacy-policy.astro:36`) and "We never record what you write". The coming soon page (#33) promises that we'll publish where a manuscript goes before launch. This ticket is that work, and it ships in the same release as the tool.

## What

- **Privacy policy:**
  - Rewrite "We don't receive what you write" so it covers the free tools and the checker separately.
  - Name Anthropic as a recipient.
  - Check that "We don't use personal data to train AI models" still holds, against Anthropic's current API terms.
  - State retention, both ours and Anthropic's.
  - State the transfer basis for data leaving the EU and UK.
- **Registry and records:** add Anthropic to `VENDORS` and to `privacy/vendors.md`, with its role, terms and data-sharing settings, so `privacy:records` passes. Run `npm run privacy:lock`.
- **CSP:** add Anthropic, or our own proxy, to `connect-src`.
- **Tool page:**
  - `data-immersive` on the working view.
  - Any storage through `stored()`.
  - An entry in `TOOLS_VISITORS_WRITE_IN` in `scripts/privacy-scan.ts`.
- **Analytics:** events stay count-only, with word buckets and never text.
- **On the page:** replace the "Your manuscript" section on `/tools/continuity-checker` with the real statement.

## Acceptance criteria

- [ ] The policy describes what happens to a manuscript, and no line in it is false.
- [ ] Anthropic is in the registry, the lock and the vendor records.
- [ ] The scan passes with the tool's text box covered.
- [ ] Reviewed by someone qualified before launch.
