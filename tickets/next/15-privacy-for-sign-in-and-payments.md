# 15 · Privacy changes for sign-in and payments

**Depends on:** the sign-in and payments feature work (not yet ticketed)
**Part of:** — (follow-on to #00)

## Why

The privacy and cookie policies currently say there are no accounts, no payments and no email addresses collected, and that is true. Those statements must change in the same release as the features, not before: a policy has to describe what actually happens. The early draft policy had account, payment and licence sections written for this; the points below preserve them.

## What

Do all of this in the release that ships sign-in or payments, not in a later one.

- **Registry (#01):** add Stripe to `VENDORS` (a processor for payments; confirm its role, and the transfer mechanism, against its current terms). Add any email or auth provider the same way. Register every new cookie, local-storage and session-storage key for sign-in, and decide each one's category (a sign-in session cookie is strictly necessary).
- **Lock (#07):** run `npm run privacy:lock`. A new controller in a consent-requiring category, a new purpose, or a key moved into one is a major bump and re-asks visitors; a processor serving purposes visitors already agreed to, and necessary additions, are minor. Check the bump matches what you expect.
- **Privacy policy (`src/pages/privacy-policy.astro`):**
  - Remove "no accounts" and "no email addresses" from "What we don't do".
  - Add the categories of personal data: account and contact information (name, email), payment information (handled by Stripe; we receive confirmation and billing contact details but never full card numbers), and purchase and licence information (orders, licence issued, download history).
  - Add purposes and legal bases: providing the service and fulfilling purchases (performance of contract), billing and collection, support, and legal obligations.
  - Add a retention period for account and purchase records, which tax and accounting rules may require us to keep.
  - Add a Terms of Service link once a terms page exists, and the disclosure "to enforce our agreements, including billing and collection".
  - Re-check "Your rights" for what we can now actually look up and delete.
- **Cookie policy:** update the necessary-storage section for any sign-in or checkout storage (the table updates itself).
- **Email signup:** `EMAIL_CAPTURE_ENABLED` and `src/components/privacy/privacyPolicyModel.test.ts` guard the policy's "we collect no email addresses" line. Update both together, and #13's records.
- **Vendor and processing records (#13):** add Stripe and the auth or email provider to `privacy/vendors.md` and `privacy/processing-record.md`, with a processor agreement or accepted terms and a review date.
- **CSP and scan (#11, #12):** allow any new origins (Stripe's script and frames, for example) and re-run the scan; the registry should drive both.
- **Sign-in tripwire:** add a test, like the email one, that fails when sign-in is switched on while the policy still says there are no accounts.

## Acceptance criteria

- [ ] Registry, lock, both policies, CSP and `privacy/` records all updated in the same release as the feature.
- [ ] Policy no longer says "no accounts", "no payments" or "no email addresses".
- [ ] Scan passes with the new vendors present.
- [ ] Reviewed by someone qualified before relying on it.
