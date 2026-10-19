---
id: 0009
title: vitest 5 as the test runner
status: accepted
date: 2026-10-19
---

# 0009 vitest 5 as the test runner

## Context

The suite needs a runner that works on every supported Node line, can build the artifact through a
global setup hook, and can spawn `node` to exercise the real built file. vitest 5 declares
`engines.node` of `^22.12.0 || ^24.0.0 || >=26.0.0`, matching the consumer floor exactly.

## Decision

Use vitest 5.

## In the user's words

> "vitest 5" (user, 2026-10-19)

## Consequences

- `globalSetup` builds the bundle once, so `pnpm test` never depends on a prior `pnpm build`.
- The bundle suite runs the built file from a temp directory outside the repository. Inside the
  repository, Node would resolve `node_modules` by walking up and the test would prove nothing.
