# 09 · Cookie policy page

**Depends on:** #01, #06, #07 (and #12 for the share-link claim)
**Part of:** #00

## Why

The draft policy (Cookie_Policy.docx, not in the repo) is a generic template. It mentions sign-in and purchases, which the site doesn't have, and lists `_gid`, which is from the old Universal Analytics, not GA4. The cookie table is the part most likely to drift, so it should be generated.

## What

Create `src/pages/cookie-policy.astro`. Write the prose by hand; generate the rest from the registry and lock file.

### Rewrite from the draft

- Company name ("The Department of Second Drafts" or the legal entity, see open questions), domain `seconddrafts.com`, contact email.
- "Cookies **and similar technologies**": explain that we mainly use local storage and session storage, which are covered the same way.
- **Strictly necessary:** saving your script, settings and dismissed hints, and remembering your consent choice. Remove sign-in and purchase.
- **Analytics:** Google Analytics. Not loaded at all until you consent. Name the data it collects, that it's shared with Google, and the international transfer basis.
- Keep: no advertising or cross-site tracking; your choices; browser controls; GPC; Google's opt-out add-on; changes; contact.
- **Your script stays on your device.** Say that the script is kept in your browser, and that share links carry the script in the part of the URL after `#`, which browsers don't send to servers. Publish this claim only once #12 proves no outgoing request contains script text.

### Generated parts

- The table, grouped by category: name, provider (us or the vendor's name), purpose, storage type, retention. Built from `STORAGE` and `VENDORS`.
- "Last updated" from the lock file's `updated`.
- A "Change your cookie settings" button that opens the #06 settings dialog.

### Retire the draft

Once this page is live, the code is the source of truth. Don't keep editing the .docx.

## Acceptance criteria

- [ ] `/cookie-policy` is live, linked from the footer and the banner.
- [ ] The table is generated; adding a registry entry changes the page with no manual edit.
- [ ] "Last updated" comes from the lock file.
- [ ] Google Analytics (`_ga`, `_ga_<ID>`, 2 years) is listed even though GA isn't switched on yet.
- [ ] No mention of sign-in, purchases or `_gid`.
- [ ] Reviewed by someone qualified before relying on it.

## Open questions

- Legal entity name and contact email for the policy.
