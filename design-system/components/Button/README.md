Buttons start an action; one `primary` or `accent` per view.

- **primary** (`ink` fill): the main action of a panel — Save, Create, Apply.
- **accent** (`marker-blue` fill): the one move *forward* in the writer's process — Publish, Send to editor, Start revision. At most one per screen; never next to a primary.
- **secondary** (outlined in `rule-strong`): alternatives — Export, Duplicate.
- **quiet** (text; a yellow highlight on hover): low-stakes actions in dense places — Reply, Resolve, Cancel.

Consumer provides: `children` (a verb in sentence case, two or three words), optional `variant`, `size` (`sm` in margin notes and toolbars, `lg` only for marketing), optional 18px Lucide `icon`, and any native button props.

Do: lead with the verb ("Send to editor"). Don't: put two accents side by side, use red for destructive actions (use secondary + a confirmation that names what will be lost), or write "Submit".
