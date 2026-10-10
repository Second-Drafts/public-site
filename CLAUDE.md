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

For more details especially as they relate to specific tasks (refactoring, naming, designing), read the `philosphy-of-software-design` skill



# A Philosophy of Software Design - Claude Code Skills

These code skills are based on John Ousterhout's book "A Philosophy of Software Design". They provide practical guidance for writing simple, maintainable code that minimizes complexity.

## Core Philosophy

**The fundamental problem in software design is managing complexity.**

Complexity makes systems hard to understand and modify. The goal is to minimize complexity through:
- Strategic (not tactical) programming
- Deep modules with simple interfaces
- Information hiding
- Eliminating special cases and exceptions
- Good names and obvious code
- Clear abstractions

## Skills Overview

### 1. [Complexity Management](./01-complexity-management.md)
**Core Focus**: Understanding and fighting complexity

Key concepts:
- Complexity defined: change amplification, cognitive load, unknown unknowns
- Root causes: dependencies and obscurity
- Strategic vs tactical programming
- Investment mindset
- Incremental complexity accumulation

**Use when**: Starting any design, reviewing code, making design decisions

---

### 2. [Deep Modules and Abstraction](./02-deep-modules.md)
**Core Focus**: Creating powerful abstractions with simple interfaces

Key concepts:
- Deep modules: simple interface, powerful implementation
- Information hiding
- Avoiding information leakage
- Interface vs implementation
- Pass-through methods (anti-pattern)

**Use when**: Designing classes/modules, creating APIs, refactoring

---

### 3. [Error Handling](./03-error-handling.md)
**Core Focus**: Defining errors out of existence

Key concepts:
- Exceptions add complexity
- Define semantics so errors can't occur
- Mask exceptions at low levels
- Exception aggregation
- Eliminating special cases

**Use when**: Designing error handling, simplifying exception code

---

### 4. [Naming and Obviousness](./04-naming-obviousness.md)
**Core Focus**: Making code self-documenting and obvious

Key concepts:
- Names should create mental images
- Be precise, not generic
- Consistency in naming
- Making code obvious
- Avoiding surprises

**Use when**: Naming variables/methods/classes, making code clearer

---

### 5. [Comments and Documentation](./05-comments-documentation.md)
**Core Focus**: Documenting what code cannot express

Key concepts:
- Comments describe non-obvious aspects
- Write comments first (design tool)
- Interface vs implementation comments
- Different levels of detail than code
- Precision and intuition

**Use when**: Documenting code, designing interfaces, maintaining docs

---

### 6. [General-Purpose Design](./06-general-purpose-design.md)
**Core Focus**: Somewhat general-purpose is deeper

Key concepts:
- General-purpose modules are deeper
- Sweet spot: not too specific, not too general
- Different layers, different abstractions
- Avoiding pass-through methods
- Separating general and special-purpose code

**Use when**: Designing interfaces, creating reusable components

---

### 7. [Design Process](./07-design-process.md)
**Core Focus**: How to approach design

Key concepts:
- Design it twice (consider alternatives)
- Incremental design evolution
- Writing comments first
- Strategic refactoring
- Investment in design quality

**Use when**: Starting new features, refactoring, throughout development

---

### 8. [Consistency and Conventions](./08-consistency-conventions.md)
**Core Focus**: Leverage through consistency

Key concepts:
- Consistency reduces cognitive load
- Types: naming, style, interfaces, patterns
- Establishing and enforcing conventions
- Following existing patterns
- When consistency goes too far

**Use when**: Writing code, code reviews, establishing team practices
