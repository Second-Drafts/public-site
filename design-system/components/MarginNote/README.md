MarginNote is a comment in the manuscript margin, from a teammate or an AI agent.

The header shows the collaborator's marker nib (their assigned colour), name, an AGENT badge when `agent` is set, and the time in `meta`. An optional `quote` shows the passage under discussion highlighted; the body is `prose-sm`.

Consumer provides: `author`, `color` (the collaborator's marker — assign yellow, pink, blue, green, orange in join order), `agent` for AI collaborators, `time`, optional `quote`, `children` (the comment), `actions` (`Button variant="quiet" size="sm"`: Reply, Resolve; an agent's suggestion adds Accept), `resolved` to fade it.

Do: name agents for what they do ("Continuity agent"), never with a human name. Don't: give agents a special colour, or show a note without its author.
