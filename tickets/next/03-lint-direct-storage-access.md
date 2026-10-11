# 03 · Lint against direct storage access

**Depends on:** #02 (so the codebase passes when the rule turns on)
**Part of:** #00

## Why

The storage interface only protects us if nothing bypasses it. A lint rule catches first-party bypasses in the editor and before deploy. (It can't see aliasing tricks or third-party scripts; the scan in #12 catches those.)

## What

Add oxlint (not yet a dependency) with a `lint` script and an `.oxlintrc.json`. These built-in rules were tested on oxlint 1.87 and catch every case below without a plugin:

```json
{
  "rules": {
    "no-restricted-globals": ["error",
      { "name": "localStorage",   "message": "Use stored() from src/lib/privacy/storage." },
      { "name": "sessionStorage", "message": "Use stored() from src/lib/privacy/storage." },
      { "name": "indexedDB",      "message": "Register the store in src/lib/privacy/registry first." },
      { "name": "caches",         "message": "Register the store in src/lib/privacy/registry first." },
      { "name": "cookieStore",    "message": "Use stored() from src/lib/privacy/storage." }
    ],
    "no-restricted-properties": ["error",
      { "object": "document",   "property": "cookie" },
      { "object": "window",     "property": "localStorage" },
      { "object": "window",     "property": "sessionStorage" },
      { "object": "window",     "property": "indexedDB" },
      { "object": "globalThis", "property": "localStorage" },
      { "object": "globalThis", "property": "sessionStorage" }
    ]
  },
  "overrides": [
    { "files": ["src/lib/privacy/**"], "rules": { "no-restricted-globals": "off", "no-restricted-properties": "off" } },
    { "files": ["src/pages/sandbox/**"], "rules": { "no-restricted-globals": "off" } }
  ]
}
```

- The sandbox override is deliberate: sandbox pages are removed from the build (`astro.config.mjs`) and its `is:inline` theme script can't import modules. If sandbox pages ever ship, remove the override and register `sandbox-theme`.
- Check that oxlint lints `<script>` blocks inside `.astro` files. If it doesn't, find another way to cover them before closing this ticket.
- Add `npm run lint` to `predeploy`.

## Acceptance criteria

- [ ] `oxlint` is a dev dependency; `npm run lint` passes on the current codebase.
- [ ] A deliberate `localStorage.setItem` in a `.ts` file outside `src/lib/privacy/` fails lint.
- [ ] A deliberate `document.cookie` write inside an `.astro` `<script>` fails lint (or there's a documented alternative check).
- [ ] `predeploy` runs lint before the build.
