# 34 · Waitlist form for the Continuity Checker

**Depends on:** —
**Part of:** #33

## Why

The coming soon page (#33) exists to collect a waitlist and learn from the writers who join it. Collecting email addresses changes what the privacy policy can promise, so how we collect them is a decision to make deliberately.

## What

Decide first:

- **Our own form and a small database.** This keeps visitors' details in our hands and in our design. The site is static on GitHub Pages, so it needs a serverless endpoint and somewhere to store the answers. That means `form-action` and `connect-src` in `src/lib/privacy/csp.ts` and a registry vendor for the host.
- **A Typeform link that opens in a new tab.** Nothing loads on our page, so there are no security policy changes. Typeform becomes a processor holding the emails.
- **How long we keep emails and answers.**

Either way (a subset of #15):

- **Privacy policy:** replace "we don't ask for your name or email address" and add a waitlist section covering purpose, legal basis (consent), recipient, retention and how to be removed.
- **Records:** `privacy/vendors.md` and `privacy/processing-record.md`.
- **Email guard:** `EMAIL_CAPTURE_ENABLED` covers the teleprompter's own in-page signup, which stays off. Reword its test in `src/components/privacy/privacyPolicyModel.test.ts` so it no longer claims the site collects no email at all.
- **Review:** run the `privacy-reviewer` agent.
- **"What we don't do":** reword the bullet at `privacy-policy.astro:31`.
- **Survey free text:** Q6 and the Q10 reassurance box invite quotes from manuscripts. "We don't receive what you write" (`privacy-policy.astro:36`) needs a carve-out for the survey, and free-text answers need their own retention.
- **One consent per purpose:** launch email, early access, and using answers for product research are separate purposes. Each needs its own legal basis and wording, and withdrawing must be as easy as agreeing.
- **Analytics:** keep `cc_waitlist_clicked` count-only. Never add an event carrying form values or the email address.

If we build our own form:

- Add spam and abuse protection, and a way to delete someone's answers on request.
- `privacy:lock` needs a person to confirm the host's role, and `privacy:records` needs its terms and data-sharing settings recorded.
- Add the form to the leak checks in `scripts/privacy-scan.ts`, since visitors write in it.

If we use Typeform:

- Link with `rel="noopener noreferrer"`.
- Say in the policy that the visitor leaves our site and Typeform sets its own cookies.
- Record a transfer basis for Typeform as a processor.

### Survey questions

1. What are you working on? (novel / series / short fiction / screenplay / narrative nonfiction / other)
2. Genre?
3. How long is it? (under 50k words / 50–100k / 100–150k / 150k+ / a series)
4. Where is it now? (first draft / revising / going to readers, an agent or an editor soon / published)
5. How do you catch continuity slips today? (memory / notes or a story bible / beta readers / an editor / software / I don't)
6. Tell us about a slip you or a reader caught. (open text)
7. When would you run a check? (after each session / before it goes to readers / both)
8. What do you write in? (Word / Google Docs / Scrivener / Markdown or plain text / other). The spike only reads plain text.
9. What would you expect to pay to check one full manuscript? (price bands / I'd want a subscription / I wouldn't pay)
10. How do you feel about sending your manuscript to an AI service for checking? (1–5, plus an optional "what would reassure you?")
11. Email, a required "email me when it launches" box, and an optional "I'd like to try an early version" box.

## Acceptance criteria

- [ ] Tool chosen and retention decided.
- [ ] Privacy policy, records and email guard updated in the same release as the form.
- [ ] `WAITLIST_URL` in `src/tools/continuity-checker/waitlist.ts` points at the form.
- [ ] `npm run predeploy` passes.
