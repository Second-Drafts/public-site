# 34 · Waitlist form for the Continuity Checker

**Depends on:** —
**Part of:** #33

## Why

The coming soon page (#33) exists to collect a waitlist and learn from the writers who join it. Collecting email addresses changes what the privacy policy can promise, so how we collect them is a decision to make deliberately.

## Decisions

- **Our own form, posting to a Cloudflare Worker with a D1 database created with `--jurisdiction eu`.** Typeform was ruled out: its free plan allows about 10 responses a month and it stores data in the US. A Tally link would look like Tally and keep the visitor off our page, and a Tally embed loads a third party on page load. Supabase's free projects pause after a week without activity.
- **The Worker is served from `*.workers.dev`.** DNS is at GoDaddy, and a custom domain needs the zone on Cloudflare. If DNS moves later, changing the origin in `VENDORS` is enough.
- **One endpoint and one policy for every form.** Each submission records which form it came from and, where relevant, the feature (`continuity-checker`, `teleprompter:voice_scroll`), so we only email people about what they asked about. The privacy policy's "Waitlists and forms" section covers forms in general, and each form states its own purpose next to its button. Accounts are out of scope (#15).
- **The teleprompter's coming-soon email signup ships in this release.** Fill in `subscribe()` in `src/tools/teleprompter/lib/interest.ts`, then remove `EMAIL_CAPTURE_ENABLED`.
- **Form order:** step 1 is the email and consent boxes, saved straight away. Step 2, "Help us build it", holds Q1–Q10, all optional.
- **Retention:** an email address is kept until we've sent what the person asked for, or until they ask to be removed, whichever comes first. Answers to optional questions are deleted 12 months after they're submitted.
- **Sending:** by hand from our Proton Mail inbox, in batches of up to 100 BCC recipients. Unsubscribing means replying, and we act on the reply. Proton isn't recorded in this release; add a `privacy/vendors.md` section before the first send (Swiss, so EU adequacy covers transfers). The policy names "our email provider" as a category of recipient so it stays true in the meantime.
- **New UI:** add `ChoiceField` (radio or checkbox options) and `ScaleField` (1–5) next to `TextField.astro`. Write the survey as plain Astro markup, with no form schema or rendering engine.

## Setup (account owner)

- Create the Cloudflare account and accept its terms, including the DPA.
- Run `npx wrangler login` once.

## What

Common to every form option (a subset of #15):

- **Privacy policy:** drafted. "What we don't do" now carves out forms, and a new "Waitlists and forms" section covers purpose, legal basis, recipients, retention and how to be removed.
- **Records:** `privacy/processing-record.md` drafted. Still to do: the Cloudflare section in `privacy/vendors.md`.
- **Email guard:** the test that asserted `EMAIL_CAPTURE_ENABLED` is false has been removed, because the policy now covers the teleprompter signup.
- **Review:** run the `privacy-reviewer` agent.
- **Survey free text:** Q6 and the Q10 reassurance box invite quotes from manuscripts. The policy now covers this, and the form's hint should say there's no need to paste passages.
- **One consent per purpose:** launch email, early access, and using answers for product research are separate purposes. Each needs its own legal basis and wording, and withdrawing must be as easy as agreeing.
- **Analytics:** keep `cc_waitlist_clicked` count-only. Never add an event carrying form values or the email address.

For our own form:

- **Worker:** a POST endpoint with CORS limited to `https://seconddrafts.com`, a honeypot field and a rate limit. No Turnstile, since it's another third-party script. Deploy it with its own npm script, separate from `deploy`.
- **Operations:** npm scripts to export signups (for sending the launch email), to delete one person by email (for removal requests), and to delete survey answers older than 12 months.
- **Records:** a `VENDORS` entry for Cloudflare, with the Worker origin in `origins.data`. That feeds `connect-src`, and `form-action` stays `'self'` because we submit with `fetch`. Its role is processor and its transfer basis is the EU–US Data Privacy Framework. Add a section in `privacy/vendors.md` for Cloudflare. `privacy:lock` needs a person to confirm Cloudflare's role, and `privacy:records` needs its terms recorded.
- **Leak checks:** add both forms to `TOOLS_VISITORS_WRITE_IN` in `scripts/privacy-scan.ts`. Answers may reach our Worker's origin and must go nowhere else.
- **No IP addresses in storage:** the policy promises we don't store them with a submission. The rate limit may use the IP in memory, but never write it to D1.
- **Errors:** if the save fails, show a clear message and offer emailing us as a fallback.

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

- [x] Tool chosen and retention decided.
- [ ] Privacy policy, records and email guard updated in the same release as the form.
- [ ] `WAITLIST_URL` in `src/tools/continuity-checker/waitlist.ts` points at the form.
- [ ] `npm run predeploy` passes.
