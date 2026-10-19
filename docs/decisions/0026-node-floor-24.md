---
id: 0026
title: Node floor 24.11.0
status: accepted
date: 2026-10-21
---

# 0026 Node floor 24.11.0

## Context

Decision 0022 left one Node floor, `>=22.22.1`, derived from the packages: lint-staged 17.6.0 needs
`>=22.22.1`, and tsdown 0.23.1 accepts `^22.18.0 || ^24.11.0 || >=26.0.0`. The user asked why that
number was needed at all, and whether the floors could be merged.

## Decision

The one floor becomes `>=24.11.0`, the first release of the Node 24 LTS line (2025-10-28) and the
lowest release of that line every pinned package accepts: tsdown 0.23.1 and rolldown-plugin-dts
0.28.8 need `^24.11.0` or newer, and no other package in the lockfile asks for more.

This supersedes decision 0022. Its rule stands: one floor, declared once in `engines.node`, repeated
only in `scripts/install.sh` and `docker/home.html`, and proved equal to `engines.node` by
`tests/install.test.ts`. Only the number changes.

## In the user's words

> "Gộp chung 22.12.0 được không, 22.22.1 là ai đòi?" (user, 2026-10-21)
>
> "Vật tất cả lên 24.x nhé, hướng đó ổn không?" (user, 2026-10-21)

## Consequences

- A user on Node 22 is refused by the installer: "node >= 24.11.0 is required". That is the price of
  the 24 line. Node 22 leaves maintenance on 2027-04-30 and Node 24 on 2028-04-30, so the floor
  outlives the line it replaces.
- The floor is the level tsdown 0.23.1 asks for: its range is `^22.18.0 || ^24.11.0 || >=26.0.0`, so
  24.11.0 is the lowest release of the 24 line the toolchain works on. A dependency that raises that
  level fails CI at install, and the floor is raised on purpose.
- The bundle targets the Node 24 line, the major line of the floor, so nothing in the artifact is
  older than what the installer accepts.
- CI installs exactly the floor, so one run proves the toolchain and the shipped bundle on the oldest
  version anyone may use.
