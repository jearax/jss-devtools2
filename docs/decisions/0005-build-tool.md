---
id: 0005
title: tsdown 0.23 as the build tool
status: accepted
date: 2026-10-19
---

# 0005 tsdown 0.23 as the build tool

## Context

The CLI ships as one file that must run without `node_modules`. It needs a bundler that produces
ESM for Node and can be driven from a script, because the test suite builds the artifact itself
rather than depending on a prior manual build.

## Decision

Build with tsdown 0.23, pinned exactly.

## In the user's words

> "tsdown 0.23" (user, 2026-10-19)

## Consequences

- tsdown is pre-1.0, so the pin is exact and upgrades are deliberate.
- The version has to stay below Node 23 and at or above 24.11 on the 24 line, which the CI matrix
  satisfies by always taking the latest patch of each supported line.
- `tests/setup/global-setup.ts` calls the tsdown API, so `pnpm test` stays self-contained and tests
  the artifact that would actually ship.
