StatusTag shows where a piece of writing is in its life: Draft, In review, Approved, Published, Blocked.

- `draft` — `marker-yellow` · `review` — `marker-pink` · `approved` — `marker-orange` with a check · `published` — `ink` · `blocked` — `red-pen` outline with a cross.
- Text is `label` style (uppercase Josefin) in `on-marker`; every status has its word, so colour never carries it alone.

Consumer provides: `status`, optionally `children` to rename the word for a workflow ("Scheduled", "Sent"). Keep renamed words to one or two.

Don't: invent new colours for new states — map them to the five above — or use StatusTag as a generic label/category chip.
