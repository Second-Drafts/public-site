# 07 · Registry lock file and derived version

**Depends on:** #01
**Part of:** #00

## Why

A hand-bumped version depends on someone remembering to bump it. Instead, commit a snapshot of everything we disclose and fail tests when the registry drifts from it. Updating the snapshot becomes the explicit "I've checked the policy" step, and the size of the version bump is derived from what changed.

## What

- `src/lib/privacy/registry.lock.json`, committed. It holds:
  - `version` (semver), `updated` (date)
  - The disclosure fields of every category, vendor and storage entry: category, vendor, area, `purposeId`, purpose, retention, origins, transfer.
  - Not internal-only fields like `owner`.
- "Longer retention" compares the structured `Retention` values from #01: `"until-tab-closed"` < any `{ months }` (compared by number) < `"until-cleared"`.
- The registry has no imports and uses only erasable TypeScript, so the lock script can be a `.ts` file run by Node 22 directly. It currently prints a `MODULE_TYPELESS_PACKAGE_JSON` warning because `package.json` has no `"type"`. Either name the script `.mts` or check whether the existing `scripts/*.js` survive `"type": "module"`.
- `npm run privacy:lock` regenerates the lock from the registry, prints a diff, proposes the bump and writes it. The person running it can raise the bump but not lower it.
- A unit test fails when the registry and lock disagree, with a message saying to run `npm run privacy:lock` and review the cookie policy.

### Bump rules

| Bump | When | Consequence |
|---|---|---|
| **Major** | In a consent-requiring category: a new controller (or a processor that becomes one), a new `purposeId`, a key moved into the category, or a longer retention for a purpose | Visitors are asked again (#04) and the policy changes |
| **Minor** | Any other disclosed change: necessary keys added or removed, purpose wording edited, shorter retention, origins changed | Policy table and "Last updated" change |
| **Patch** | Lock metadata only | Nothing visible |

**Revised after release:** visitors consent to purposes, not to particular vendors or keys. A new processor, or a new key serving a purpose already consented to for no longer than before, is minor. Swapping one analytics processor for another with the same purposes no longer re-asks everyone. Because the lock now trusts `purposeId` and `role`, `npm run privacy:lock` asks Jev whether a reworded purpose is really a new use, and the privacy reviewer agent (`.claude/agents/privacy-reviewer.md`) checks roles.

- The consent module (#04) reads the major version from the lock instead of the hard-coded `"1"`.
- The policy page (#09) reads `updated` for "Last updated".

## Acceptance criteria

- [ ] Lock file committed, generated from the registry including Google Analytics.
- [ ] Test fails on any registry change until the lock is regenerated.
- [ ] Unit tests for the bump rules: each row in the table above, and a combination picks the largest bump.
- [ ] #04 uses the lock's major version.
