# 05 · Gate analytics on consent

**Depends on:** #04
**Part of:** #00

## Why

Today `initAnalytics()` starts every configured provider on page load, which would load `gtag.js` (and set `_ga` cookies) before anyone has agreed. Analytics must start only once the analytics category is granted.

## What

In `src/tools/teleprompter/lib/analytics/index.ts` (or wherever analytics moves to when it becomes site-wide):

- `initAnalytics()` starts providers inside `consent.whenGranted("analytics", ...)`. Nothing loads before consent.
- Use the "basic" approach: don't load `gtag.js` at all until consent. Don't use Google Consent Mode's "advanced" mode, which sends cookieless pings before consent; that is legally contested in the EU and the registry/policy don't describe it.
- **Events before a decision:** keep the existing in-memory queue (it never touches device storage or the network). Flush it when analytics is granted; clear it when analytics is denied or GPC applies. This keeps the first visit's page view if the visitor accepts on that page.
- Each provider in `providers/` declares the vendor it uses (`gtag` → `google-analytics`, `console` → none) so the registry and providers can't disagree. Add a test that every non-console provider names a registered vendor.
- Keep `sanitize()` and the "no script text in events" rule as they are.

## Acceptance criteria

- [ ] With no consent decision, no request goes to any Google origin and no `_ga*` cookie is set (verify manually now; #12 makes it automatic).
- [ ] Accepting on the page loads the provider and sends the queued page view.
- [ ] Rejecting clears the queue and nothing is sent.
- [ ] Withdrawing later purges analytics storage and reloads (via #04).
- [ ] Unit tests cover the queue flush and clear paths.
