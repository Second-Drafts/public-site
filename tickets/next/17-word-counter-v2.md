# 17 · Word counter v2 (overview)

Child tickets: 18–31.

## Goal

Turn the word counter from a bare first draft into a tool that sets itself apart, the way the teleprompter does. Most word counters only count. Ours should help with the next step, a second draft: hitting a format's limit, seeing what has to be cut, and knowing how long the piece runs aloud.

It's still a cheap bet, like the teleprompter: no backend, no accounts, and the visitor's text never leaves the browser.

## Where it stands

`src/pages/tools/word-counter.astro` is one 170-line page holding its markup, styles and script. It has no persistence, analytics or SEO content. It also has its own `countWords`, separate from the teleprompter's `lib/timing.ts`, so the two tools can disagree about the same text.

## Shared design

- **One module for measuring text** (#18). Both tools count words, characters and speaking time through it, so they always agree.
- **The tool lives in `src/tools/word-counter/`**, laid out like `src/tools/teleprompter/`: a small store, mount functions per part of the UI, and a thin `main.ts`. The page in `src/pages/tools/` only composes components.
- **One target model** (#19). A target is a unit, a number and a rule. Presets are named targets. The status line, the cut line (#27) and analytics all read from that single model, so none of them needs to know about presets.
- **Privacy rules carry over unchanged.** New storage keys go in the registry (`src/lib/privacy/registry.ts`). New events go in `EVENT_SCHEMA`, and properties never carry visitor text or anything derived from it beyond a word-count bucket. Run `npm run privacy:lock` after either change.
- **The privacy scan drives this page.** `scripts/privacy-scan.ts` (`countWords`, around line 210) clicks `#show-target`, `#unit` and `#style`. Any ticket that changes those controls updates the scan in the same commit.

## Order

The difficult, shared logic comes first and is done serially, so the later tickets are UI wiring against a stable, tested API and can run in parallel without touching the same files.

| Phase | Tickets | Model | Why this order |
|---|---|---|---|
| 0 · Foundations | #18 measurement (word spans, limit offsets, sentences, speaking time) | Opus | Every count, cut and selection reads from it |
| 0 · Foundations | #19 module, target model and status, shared infra | Opus | The layout every later ticket adds to; the one target model |
| 1 · Shared registries | #20 saving, then #23 analytics | Sonnet | Both change the privacy registry and lock file, so they run one after the other |
| 2 · Features | #27 cut line | Opus | The highlight layer is the riskiest UI work |
| 2 · Features | #25 presets, #28 selection, #29 session progress, #30 rhythm | Sonnet | Independent of each other |
| 2 · Features | #21 speaking time | Haiku | Display only |
| 2 · Features | #22 open in teleprompter, #24 SEO | Sonnet | After #21 |
| Later | #26 preset landing pages | — | Once #23 shows which presets people use |
| Later | #31 writing sprint tool, spun out of #29 | — | Sprints need a focused writing screen, not a panel in the counter |

Phase 2 tickets each add one component and one mount line, and call analytics hooks #23 already registered, so they don't edit `EVENT_SCHEMA`, the lock file or the settings validator. Run each in its own worktree and merge them one at a time.
