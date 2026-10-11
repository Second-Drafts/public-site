# 06 · Consent banner, settings and footer link

**Depends on:** #04
**Part of:** #00

## Why

Visitors need a way to give, refuse and later change consent. Regulators (EDPB, CNIL, ICO) are specific about what a valid banner looks like, so the requirements below are not just style choices.

## What

### Banner

- Shown when `consent.decided()` is false (and GPC isn't set, see #04).
- **Accept** and **Reject** with equal visual weight, on the first layer. No "reject" hidden behind settings.
- A **Settings** option that opens the settings dialog, and a link to the cookie policy (#09).
- Nothing pre-ticked. No cookie wall: the site works fully without a choice.
- Non-modal and out of the way (for example a bottom region). Don't trap focus; give it a labelled landmark so screen readers can find it.
- **Don't overlay the teleprompter while it's prompting.** Delay the banner until the visitor leaves the prompt view. Since nothing is collected before a decision, waiting is safe.
- Copy is short and plain: what analytics is for, that it uses Google Analytics, and that rejecting changes nothing about how the tools work.
  - **Revised after release:** the banner names the purpose ("analytics") rather than the vendor, and says it never sees "what you write" rather than "your scripts", so the copy holds as vendors and tools change. Google Analytics is still named one click away, in the settings dialog and both policies.

### Settings dialog

- One toggle per consent-requiring category (only analytics today), generated from `CATEGORIES` in the registry, with each category's description.
- Shows the vendors in each category from `VENDORS`.
- Save writes through `consent.set(..., "settings")`.

### Persistent entry point

- `Base.astro` has no footer yet. Add one (or another persistent spot) with a **Cookie settings** link and links to the cookie and privacy policies.
- The cookie policy page (#09) also has a "Change your cookie settings" button.

### Design

Build with the design system (`DESIGN.md`, `design-system/`) and review it with the impeccable skill. Commit the banner copy as code, so git history shows what visitors were told for each `registryVersion` (#04).

## Acceptance criteria

- [ ] Banner appears on a first visit and not after a decision; reappears after expiry or a registry major bump.
- [ ] Accept and Reject are the same size and weight on the first layer.
- [ ] Keyboard-only and screen-reader walkthrough passes; respects reduced motion.
- [ ] Banner never covers the prompt stage while prompting.
- [ ] Footer has Cookie settings, Cookie policy and Privacy policy links on every page.
- [ ] Settings toggles are generated from the registry, not hard-coded.
