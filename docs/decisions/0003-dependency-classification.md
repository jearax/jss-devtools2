---
id: 0003
title: Dependencies follow the Node convention
status: accepted
date: 2026-10-19
---

# 0003 Dependencies follow the Node convention

## Context

A package can classify a library either way, and the CLI has a consequence that makes the choice
matter: installation is native, never npm, so the published artifact ships with no `node_modules`.
Whatever the CLI needs at runtime has to end up inside the bundle.

## Decision

Classify by the Node convention: libraries the CLI loads at runtime go in `dependencies`, everything
used only to build or test goes in `devDependencies`. Because the artifact ships without
`node_modules`, the build inlines everything in `dependencies`.

## In the user's words

> "deps hay dev-deps thì tuỳ kiến thức của nodejs mà cho vào phần tương ứng" (user, 2026-10-19)

## Consequences

- `tsdown.config.ts` derives its inline list from the `dependencies` keys in `package.json`, so a
  new runtime dependency cannot be silently left external.
- `tests/bundle.test.ts` runs the built file from a temp directory with no `node_modules` and fails
  if anything was left unbundled. That test is the real guard on this decision.
