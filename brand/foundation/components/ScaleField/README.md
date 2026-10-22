ScaleField is a question answered from 1 to 5, with words for what each end means. It's drawn like a segmented control: the chosen step fills with `ink`.

Consumer provides: `label` (the question), `name`, `low` and `high` (what 1 and 5 mean), optional `hint`. The answer reaches `readAnswers` as a number.

Do: say both ends in the writer's terms ("Not at all comfortable", "Completely comfortable"). Don't: use it for anything that isn't a scale; ChoiceField is for named options.

Not in the React bundle yet: Astro only.
