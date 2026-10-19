---
id: 0006
title: Node >=22.12 for consumers, tested on 22, 24 and 26
status: accepted
date: 2026-10-19
---

# 0006 Node >=22.12 for consumers, tested on 22, 24 and 26

## Context

The supporting principle is that a consumer-facing version floor trails the newest supported
release instead of chasing it: take the newest supported line, three supported lines back. On
2026-10-19 the supported Node lines were 26 (current, LTS from 2026-10-28), 24 (LTS) and 22
(maintenance until 2027-04-30), which gives a floor of 22. commander 15 needs 22.12, which fixes
the exact number.

## Decision

Consumers need Node >=22.12.0. CI runs the matrix on 22, 24 and 26. The gating CI job runs Node 24,
and the development floor is declared in `devEngines.runtime` in `package.json` (decision 0015).

## In the user's words

> ">=22.12, CI chạy 22/24/26" (user, 2026-10-19), replacing the earlier ">=24"

## Consequences

- The floor rises to 24 when Node 22 reaches end of life in April 2027.
- Node 22 must be at least 22.18 for tsdown; CI always takes the latest patch of the line, which
  satisfies this without pinning a patch.
- pnpm always refuses an install when the running Node does not satisfy this project's own
  `engines.node`, independently of any `engineStrict` setting.

## Later

Decision 0015 removed `.npmrc` and `.nvmrc` and moved both settings into files that read them
properly. The floors themselves are unchanged, and decision 0015 records why the development floor
is 22.13 rather than 22.12.

The floor was first exercised on 2026-10-19, after a review found that no job ran Node 22.12: the
matrix takes the latest patch of each line. The `consumer-floor` CI job now runs the shipped bundle
on the exact version in `engines.node`, and `@types/node` follows the 22 line so `tsc` rejects APIs
that version lacks.
