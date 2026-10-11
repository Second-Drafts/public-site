# 04 · Consent state

**Depends on:** #01, #02
**Part of:** #00

## Why

The storage interface, the analytics gate and the banner all need one answer to "what has this visitor agreed to?", plus a way to react when it changes. With no server, the record of that answer also lives on the device.

## What

Create `src/lib/privacy/consent.ts`:

```ts
consent.get(category): boolean                 // necessary is always true
consent.decided(): boolean                     // a current, unexpired decision exists
consent.set(choices, source)                   // from the banner or settings
consent.onChange(listener)
consent.whenGranted(category, run)             // runs now if granted, else once it's granted
```

### The consent record

Stored under the `privacy:consent` key (necessary, localStorage) through the #02 interface:

```ts
{
  id: string,                          // random UUID, so a record can be referred to
  registryVersion: string,             // major version from the lock file (#07)
  choices: Record<ConsentCategoryId, boolean>,   // from #01; { analytics: boolean } today
  decidedAt: string,                   // ISO timestamp
  source: "banner" | "settings" | "gpc",
}
```

- **Expiry and re-prompting.** A record counts as undecided when its `registryVersion` major is older than the current one, or when it's older than `CONSENT_MAX_AGE` (6 months, CNIL's recommendation). Rejections are remembered the same way, so we don't nag.
- **GPC.** If `navigator.globalPrivacyControl === true` and there's no record, treat analytics as denied and don't show the banner (the visitor has already said no). Settings still lets them opt in explicitly, which is stored with `source: "settings"`.
- **Withdrawal.** When analytics changes from granted to denied: call `purgeCategory("analytics")` (#02), then reload the page, because a loaded `gtag.js` can't be unloaded.
- **Proof of consent.** Wrap persistence in a `recordConsent(record)` function. Today it only writes to the device. Git history of the registry, lock file and banner copy shows what the visitor was told for each `registryVersion`. If we ever add a server, a server-side log replaces `recordConsent` with no changes to callers.
- Replace the "analytics not granted" stub from #02 with this module.

## Acceptance criteria

- [ ] `consent.ts` with the interface above and unit tests for: no record, accept, reject, expired record, older registry major, GPC with no record, GPC then explicit opt-in, withdrawal purges and reloads.
- [ ] `whenGranted` runs immediately when already granted and exactly once when granted later.
- [ ] `CONSENT_MAX_AGE` is a named constant.
- [ ] The storage interface (#02) reads consent from this module.

## Open questions

- Until #07 lands there's no lock file to read `registryVersion` from. Hard-code `"1"` and replace it in #07.
