# Tickets

Work is tracked as Markdown files. The folder a ticket sits in is its status:

- `next/` — agreed and ready to pick up
- `in-progress/` — someone is working on it
- `done/` — finished

Move a ticket with `git mv` so its history follows it, and move it in the same commit as the work when you can.

## Conventions

- Filenames are `NN-short-slug.md`. The number is a permanent ID: never reuse or renumber, even after a ticket is done.
- Refer to tickets by number (`#04`) in commits, code review and other tickets.
- Each ticket lists what it **depends on**. Don't start a ticket until its dependencies are in `done/`, unless the ticket says otherwise.
- A ticket's acceptance criteria are checkboxes. Tick them as they're met; a ticket moves to `done/` when every box is ticked or the unticked ones are explicitly moved into a new ticket.
- When a ticket is finished, add an **Outcome** section: what actually changed, decisions made along the way, and any follow-up tickets created.
- An overview ticket (like `00`) holds the design that its child tickets share. It moves to `done/` after its last child does.
