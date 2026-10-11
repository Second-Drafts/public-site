# 08 · Treat the analytics event schema as a disclosure

**Depends on:** #07
**Part of:** #00

## Why

What we send to an analytics provider is part of what we disclose, not just which cookies it sets. `TpEvents` in `lib/analytics/events.ts` already defines every event and property, and `sanitize()` enforces limits. But those are TypeScript types, so nothing can check them at runtime or include them in the lock file.

## What

- Turn the event definitions into a runtime schema object (event name → property names and allowed kinds), and derive the `TpEvents` types from it so the two can't disagree.
- Include event names and property names in `registry.lock.json` (#07).
- Bump rules: a new event or property is **minor** (the privacy policy's description of analytics may need checking). A property that could carry user content is never allowed (keep the existing rule in `events.ts`).
- Optionally, `sanitize()` drops properties that aren't in the schema, instead of just checking types.

## Acceptance criteria

- [ ] Event schema exists at runtime; `TpEvents` is derived from it; existing analytics tests pass.
- [ ] Adding an event or property fails the lock test until `npm run privacy:lock` is run.
- [ ] The privacy policy (#10) describes analytics events at the level of detail the schema supports (for example "which tool settings you use, rough script length in word-count ranges, never script text").
