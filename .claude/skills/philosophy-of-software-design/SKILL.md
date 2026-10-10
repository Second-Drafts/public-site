---
name: a-philosophy-of-software-design-skills
description: Comprehensive guide to software design based on "A Philosophy of Software Design" by John Ousterhout. Covers complexity management, deep modules, error handling, naming, documentation, general-purpose design, design process, and consistency conventions.
license: MIT
metadata:
  version: 1.0.0
  author: Based on work by John Ousterhout
  tags: software-design, complexity, architecture, best-practices, code-quality
---

# Software Design Principles

A comprehensive guide to software design based on "A Philosophy of Software Design" by John Ousterhout.

## Description

This skill provides practical guidance for writing simple, maintainable code that minimizes complexity. It covers eight essential areas of software design:

1. **Complexity Management** - Understanding and fighting complexity through strategic programming
2. **Deep Modules** - Creating powerful abstractions with simple interfaces
3. **Error Handling** - Defining errors out of existence
4. **Naming & Obviousness** - Making code self-documenting
5. **Documentation** - Writing meaningful comments
6. **General-Purpose Design** - Building reusable, flexible modules
7. **Design Process** - Practical methodology and best practices
8. **Consistency** - Leveraging conventions to reduce cognitive load

## When to Use

Use this skill when:
- Designing new features or modules
- Reviewing code for quality and maintainability
- Refactoring existing code
- Establishing team coding standards
- Teaching software design principles
- Making architectural decisions

## Core Philosophy

The fundamental problem in software design is managing complexity. This skill teaches you to:
- Think strategically, not tactically
- Create deep modules with simple interfaces
- Hide implementation details effectively
- Eliminate special cases and exceptions
- Write obvious, self-documenting code
- Make continual small investments in design quality

## Quick Start

1. Read the [README](./README.md) for an overview
2. Start with [01-complexity-management.md](./01-complexity-management.md) to understand the core philosophy
3. Reference specific skills as needed during development
4. Use red flags and principles as a code review checklist

## Contents

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


Each skill includes:
- Core principles and philosophy
- Practical guidelines and examples
- Good vs bad code comparisons
- Red flags to watch for
- Benefits and when to apply

## Attribution

Based on "A Philosophy of Software Design" by John Ousterhout, published by Yaknyam Press.
