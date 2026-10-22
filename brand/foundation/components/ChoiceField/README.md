ChoiceField is a question answered by picking from a list: radio buttons for one answer, checkboxes (`multiple`) when several fit. The question is the group's legend, set in `display` at sentence case; the options are in `prose`, because they're often the writer's own situation in words.

Consumer provides: `label` (the question), `name`, `options` (`{ value, label }`; values are short slugs, labels are what the writer reads), optional `multiple`, `hint` and `other`.

`other` (`{ label, detail }`) adds a last option valued `other`. While it's picked, a TextField labeled `detail` appears under the options, named `<name>_other`. It's shown with CSS (`:has(:checked)`), so it needs no script.

Do: use `other` when the list can't be complete, and keep `detail` to a short label ("Which app?"). Stack fields `space-6` apart, or further in a long survey. Don't: use checkboxes for a single yes/no question; write a plain checkbox with a label instead.

Not in the React bundle yet: Astro only.
