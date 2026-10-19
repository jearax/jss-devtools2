---
id: 0008
title: pnpm 11.24.0, development only
status: accepted
date: 2026-10-19
---

# 0008 pnpm 11.24.0, development only

## Context

The `packageManager` field and the pinned pnpm version only affect people who develop this
repository. Consumers never see them, because installation is native and the published
`package.json` is never consumed.

## Decision

Pin pnpm 11.24.0 through `packageManager`. Nothing about the consumers' machine is constrained by it.

## In the user's words

> "chỗ này là consumer hay chỉ bản thân mình?" (user, 2026-10-19), answered by explanation rather than
> by a choice of package manager.

## Consequences

- This is an instance of the user's principle: limit the maximum version a tool requires of its
  consumers. A consumer is never asked for a specific pnpm.
- `pnpm-workspace.yaml` carries a supply-chain age allow-list for the commitlint packages, which were
  published more recently than pnpm's default window when they were pinned.
