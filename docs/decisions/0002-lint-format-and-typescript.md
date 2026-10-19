---
id: 0002
title: ESLint and Prettier, with TypeScript pinned to 6.0
status: accepted
date: 2026-10-19
---

# 0002 ESLint and Prettier, with TypeScript pinned to 6.0

## Context

The CLI needs a linter and formatter for its own source, and the same choice governs what it writes
into consumer repositories. `typescript-eslint` 8.71 declares a peer range of
`typescript >=4.8.4 <6.1.0`, so TypeScript 7 cannot be used with it.

## Decision

ESLint flat config with the official `typescript-eslint` package, plus Prettier. TypeScript is pinned
to 6.0.x.

## In the user's words

> "ESLint + Prettier, TS 6.0" (user, 2026-10-19)

## Consequences

- TypeScript must stay below 6.1 until the peer range widens. Every dependency here is pinned to an
  exact version, so this cannot drift unnoticed.
- `eslint-config-prettier` runs last in the flat config, so lint and format never disagree.
- JSON and YAML are formatted with two spaces rather than tabs, matching how those files are read.

## Later

The two-space override for JSON and YAML was dropped by decision 0014, so JSON uses tabs. YAML and
Markdown use spaces, and decision 0017 states that in `.editorconfig`, the only home for shared formatting facts.
