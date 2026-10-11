# 11 · Content Security Policy generated from the registry

**Depends on:** #01
**Part of:** #00

## Why

A CSP makes the browser refuse to contact any origin we haven't listed. Generated from `VENDORS`, it means an embed or script added by accident can't reach an unregistered third party, even if every other check misses it. That protects against unregistered data transfers (visitor IPs), not just cookies.

## What

- GitHub Pages can't set response headers, so use a `<meta http-equiv="Content-Security-Policy">` tag.
- **Use Astro's built-in support.** Astro 7 has `security.csp` in `astro.config.mjs`. It emits the meta tag, hashes Astro's own scripts and styles, and accepts extra `directives` and `scriptDirective.resources`. Build those from the registry:
  - `default-src 'self'`
  - `script-src`: `'self'` + Astro's hashes + every vendor's `origins.scripts`
  - `connect-src` and `img-src`: `'self'` + every vendor's `origins.data`
  - `font-src 'self'` (fonts are self-hosted)
- Check the GA origins against Google's own CSP guide for GA4 when implementing; Google changes them occasionally.
- Vendor origins can be included unconditionally. Consent gating is #05's job; the CSP only limits *which* third parties are reachable.
- Meta-tag CSP can't use `frame-ancestors` or `report-uri`. That's acceptable.
- CSP isn't supported in `astro dev`; test with `build` + `preview`.
- Watch for `is:inline` scripts and inline styles: both need hashes or will be blocked. The sandbox's inline script doesn't matter, since sandbox pages aren't built.

## Acceptance criteria

- [ ] `astro.config.mjs` builds its CSP from `VENDORS` origins; no origin is written by hand.
- [ ] Built pages have the meta tag and work with no CSP errors in the console (home, blog, tools, teleprompter, cookie and privacy pages).
- [ ] A test page that loads a script from an unregistered origin is blocked.
- [ ] With analytics accepted and a test GA ID (#12), GA works with no CSP errors.
