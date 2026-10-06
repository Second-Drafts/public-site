Mark draws one of the logo's marker strokes over inline text — the brand's signature gesture.

| kind | stroke | means |
| --- | --- | --- |
| `highlight` | yellow swipe behind | this matters; search hit; quoted passage |
| `underline` | green wavy line | link; an insertion |
| `circle` | pink loop | look here; the thing being commented on |
| `strike` | red-pen line through, text muted | removed; wrong |
| `check` | orange tick after | done; accepted |

Consumer provides: `kind` and short inline `children` (a word or phrase; `highlight` may wrap lines, the others should not). Strokes draw on once in 240ms and appear finished under reduced motion.

Do: use at most two Marks in a paragraph, and make sure the words say the thing — strokes are decoration. Don't: use Mark for headings in product UI (marketing only), stack two kinds on one phrase, or recolour a stroke.
