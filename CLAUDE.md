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

## Tickets

We use beads `br` for tickets. Prefix: `pub`
