---
id: 0012
title: Decision records live in docs/decisions, one file per decision
status: accepted
date: 2026-10-19
---

# 0012 Decision records live in docs/decisions, one file per decision

## Context

Phase 3 raised the question of where decision records live. The options were `docs/decisions/`
numbered files, a single `docs/decisions.md`, or no decision records yet. The old prototype kept 20
decision files in its harness directory, which is both the reason to have them and the reason to
write them properly.

## Decision

Decision records live in `docs/decisions/NNNN-<slug>.md`, one file per decision, each recording the
context, the decision, the user's own words, and the consequences.

## In the user's words

> "docs/decisions/NNNN-<slug>.md" (user, 2026-10-19), choosing the recommended option.

## Consequences

- `docs/decisions/` is the only place a "why we chose this" answer is written down. A decision made
  in chat and never recorded here did not happen.
- Each file quotes the user rather than paraphrasing intent, so a later reader can see the original
  reasoning and not an agent's reconstruction of it.
- Files are numbered in the order decisions are made, so references between them stay stable.
