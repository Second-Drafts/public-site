## Coding style

Left align the happy path.

Avoid comments whenever possible. Rely on self-documenting code. Clear and descriptive variable and function names go a long way. Unnecessarily complex functions should be decomposed into logical composable units. Comments are best used when leaving context in code that would not otherwise be clear. Comments should not be left to excuse partial or buggy implementations. We should generally try our best to leave the codebase in a good state and leave follow up notices in tickets which are actually actionable.

### Guiding principles

1. Complexity is the enemy - Everything should aim to reduce it
2. Strategic thinking required - Tactical programming creates mess
3. Invest in design - Pays off quickly (within months)
4. Comments are design tools - Write them first
5. Simple != Easy - Simple designs take thought
6. Abstractions are key - Hide complexity behind clean interfaces
7. Consistency provides leverage - Learn once, apply everywhere
8. Define problems away - Best solution is no exception
9. Obvious is crucial - Code should be immediately understandable
10. Incremental improvement - Small investments accumulate

### Key Takeaways

**Red Flags** (signs of complexity):
- Shallow modules, information leakage, pass-through methods
- Vague names, hard-to-describe interfaces
- Comments that repeat code
- Special cases proliferating
- Nonobvious code requiring extensive explanation

**Design Principles**:
- Complexity is incremental - sweat the small stuff
- Working code isn't enough - design quality matters
- Modules should be deep (simple interface, powerful implementation)
- Define errors out of existence
- Design it twice (consider alternatives)
- Comments describe what's non-obvious
- Design for ease of reading, not writing

For more details especially as they relate to specific tasks (refactoring, naming, designing), read the `engineering:philosophy-of-software-design` skill.

For anything visual or user-facing, read DESIGN.md and the `brand:brand` skill.

## Structured data

Every page goes through `Base`, which renders `SeoHead`: the `<title>`, description, canonical, Open Graph and Twitter tags, and one JSON-LD `@graph` (Organization, WebSite, the page, breadcrumbs). Don't write these tags by hand.

- `description` is required on `Base`. Breadcrumbs come from the URL path, so a new section needs a name in `SECTION_NAMES` in `src/lib/seo/site.ts`, or the build throws.
- Pass `pageType` (`AboutPage`, `CollectionPage`) when the page isn't a plain `WebPage`, and `ogImage` to use a card from `public/img/og` instead of `site`.
- Extra nodes go in the `schema` prop, built with the helpers in `src/lib/seo/schema.ts` (`toolSchema`, `blogPosting`, `blog`). Add a helper there for a new kind of page.
- `npm run schema:check` reads `dist/` and fails a page with a missing description, canonical, Open Graph tag, or a broken graph. It is part of `npm run verify`. `tsc` doesn't check `.astro` files, so this check is what catches a missing prop.

`npm run verify` (typecheck, lint, format, tests, build, spacing and schema checks) runs from the tracked `.githooks/pre-push` hook whenever you push to `main`, and again in `predeploy`. `npm install` points `core.hooksPath` at `.githooks`. Skip the hook once with `git push --no-verify`.

## Tickets

We use beads `br` for tickets. Prefix: `pub`
