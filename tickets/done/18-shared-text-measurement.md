# 18 · Shared text measurement module

**Depends on:** none
**Part of:** #17

## Why

The word counter and the teleprompter each have their own `countWords`. Today they happen to match, but they'll drift, and a writer who pastes the same script into both should never see two different numbers. Character counts are also wrong: `text.length` counts UTF-16 code units, so 👍 counts as 2 and an accented letter typed as a base letter plus a combining mark counts as 2.

## What

Create `src/lib/text/measure.ts` (or a better name chosen during design) as the single place that measures text. Rough interface:

```ts
wordSpans(text): [start, end][]          // the primitive; everything about words derives from it
countWords(text): number                 // wordSpans(text).length
countCharacters(text): number            // user-perceived characters (Intl.Segmenter, "grapheme")
countCharactersWithoutSpaces(text): number
limitOffset(text, unit, limit): number | null   // where a limit falls; null when under it
sentences(text): { start, end, words }[]
speakingSeconds(words, wpm?): number      // moved from teleprompter readTimeSeconds
formatSpeakingTime(seconds): string       // moved from teleprompter formatReadTime
wordBucket(words): WordBucket             // moved from teleprompter lib/timing.ts
```

Word positions, limit offsets and sentences live here, not in the tickets that display them (#27 cut line, #28 selection, #30 rhythm), so every feature counts the same way.

- Move the text helpers out of `src/tools/teleprompter/lib/timing.ts`. The scroll-timing helpers (`remainingSeconds`, `formatClock`) stay where they are.
- Decide what a word is, and pin it with a table-driven test. Cases to settle:

  | Text | Notes |
  |---|---|
  | `don't` | 1 |
  | `well-known` | 1 (the usual convention in word processors) |
  | `word—word` (em dash, no spaces) | Word processors disagree. Pick one; 2 matches how people read it |
  | `3.14`, `$1,000`, `10:30` | 1 each |
  | `— ` on its own, `…`, `*` | 0, since punctuation alone isn't a word |
  | URLs and emails | 1 each |
  | `日本語の文章` | Whitespace splitting says 1. Decide whether to support CJK now with `Intl.Segmenter` word granularity (`isWordLike`) or record it as out of scope |

  Design it twice: compare whitespace-plus-dash splitting against `Intl.Segmenter("word")`. Segmenter splits `well-known` into two, so it may only be right as a CJK fallback.
- `countCharacters` falls back to `Array.from(text).length` where `Intl.Segmenter` is missing.
- **Limit offsets** (for #27). `limitOffset(text, unit, limit)` returns the UTF-16 offset of the first word or character past the limit, for `words`, `characters` and `seconds` (seconds convert to words through the speaking pace). It must agree with the counts: the text before the offset counts as exactly the limit. It must stay fast at 20,000 words.
- **Sentences** (for #30). `Intl.Segmenter("sentence")` splits `Dr. Smith went home.` after `Dr.`, so merge common abbreviations back (`Dr.`, `Mr.`, `Mrs.`, `Ms.`, `St.`, `e.g.`, `i.e.`, `etc.` followed by a lowercase word, initials). Also handle ellipses, dialogue in quotes, and line breaks without punctuation.
- **Speaking time under a minute** (decided for #21). Below 60 seconds, show seconds rounded to 5 (`About 45 sec`) in both tools, since people check 30- and 60-second scripts. Zero words show nothing.
- **Longer word buckets** (for #23). Extend `WordBucket` with `601-2000`, `2001-10000` and `10000+`, in place of `600+`, for both tools. Run `npm run privacy:lock` and check the privacy policy's analytics description still fits.
- Update the teleprompter's imports. Its displayed counts and `word_bucket` values may shift slightly for edge cases. That's expected, and the tests should say so.

## Acceptance criteria

- [x] One module measures text; the teleprompter and the word counter both import from it, and neither defines its own `countWords`.
- [x] Table-driven tests cover every case above with the chosen answers.
- [x] 👍, `é` written as `e` + U+0301, and 🇺🇸 each count as one character.
- [x] Existing teleprompter tests pass (updating any expectation that the new word rules intentionally change).
- [x] `limitOffset` tests cover words, characters (including emoji and combining marks) and seconds, at, under and over the limit, and text before the offset always measures exactly the limit.
- [x] `sentences` tests cover abbreviations, ellipses, quoted dialogue and unpunctuated line breaks.
- [x] Under a minute reads in seconds in both tools.
- [x] `WordBucket` has the longer buckets, and the lock test passes.

## Outcome

`src/lib/text/measure.ts` holds words, characters, limit offsets, speaking time and word buckets. `src/lib/text/sentences.ts` holds sentence splitting. The teleprompter's `lib/timing.ts` keeps only the scroll-timing helpers.

**What a word is.** I compared the two designs. `Intl.Segmenter("word")` splits `well-known`, URLs, emails and `$1,000` into pieces, so it's wrong as the main rule. Words are the text between separators, which are:

- whitespace;
- em and en dashes and the horizontal bar;
- two or more hyphens;
- `…` or three or more dots.

A token only counts if it holds a letter or number, so `—`, `*`, `&` and an emoji alone count 0. Tokens from scripts written without spaces (Han, Hiragana, Katakana, Thai, Lao, Khmer, Myanmar) are split with `Intl.Segmenter("word")`. Its Japanese splits are dictionary-based, so CJK counts are approximate but sensible. Without `Intl.Segmenter`, such a token counts as one word.

**Sentences.** `Intl.Segmenter("sentence")` splits after `Mr.` and initials, and between `"Stop!"` and `she said`, so segments are merged back:

- when the previous one ends in a title abbreviation or a single initial;
- when the next one starts lowercase.

A line break always ends a sentence. `…` is treated like `...`, which the segmenter otherwise handles differently. Without `Intl.Segmenter`, each line is a sentence.

**Speaking time.** Below a minute it reads in seconds rounded to 5 (minimum 5) in both tools, so the teleprompter now shows `About 45 sec to read` where it said `Under a minute to read`.

**Word buckets** gained `601-2000`, `2001-10000` and `10000+`. The lock records only that `word_bucket` is a string, so the lock and its version didn't change, and the privacy policy's "ranges of word counts" still fits.

**Performance.** At 20,000 words, `limitOffset` and `sentences` take a few milliseconds. Counting graphemes takes about 30 ms, which only matters with a characters target on very long text. #27 should re-measure it with the highlight layer in place.
