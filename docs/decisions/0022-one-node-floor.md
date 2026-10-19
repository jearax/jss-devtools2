---
id: 0022
title: One Node floor, and CI runs only that version
status: superseded
date: 2026-10-19
---

# 0022 One Node floor, and CI runs only that version

Superseded by [decision 0026](./0026-node-floor-24.md), which raises the floor to `>=24.11.0`. The
rule below stands, the number changed. The content is kept as it was written.

## Context

Two floors were declared: `engines.node` `>=22.12.0` for consumers, set by commander 15, and
`devEngines.runtime` `>=22.13.0` for development, set by ESLint 10. CI ran five Node jobs: the
gating job on Node 24, a matrix on 22, 24 and 26, and a job running the bundle on exactly 22.12.0.

Checking every pinned package's `engines.node` showed the development floor was wrong: tsdown 0.23.1
needs `^22.18.0` and lint-staged 17.6.0 needs `>=22.22.1`. No job caught it, because none ran a 22
release older than the latest patch.

## Decision

One floor, `engines.node` `>=22.22.1`, the highest floor any pinned package declares. It is the
only Node version declared anywhere:

- `devEngines` is removed.
- `engineStrict: true` in `pnpm-workspace.yaml` makes pnpm refuse a Node below the floor. Without
  it, pnpm 11.24.0 only warns about the project's own `engines.node`.
- `scripts/install.sh` and `docker/home.html` repeat the number, and `tests/install.test.ts` proves
  both equal `engines.node`.
- CI runs one Node: the `checks` job reads the floor from `package.json` and installs exactly that
  version, and the `image` job reuses it. The Node matrix and the separate `consumer-floor` job are
  gone; the bundle suite already runs the built bundle directly and through a symlink on that Node.

## In the user's words

> "Update CICD 1 nodejs >=22 thôi, làm gì mà 3 node 22, 24, 26 vậy, phí tài nguyên" (user, 2026-10-19)
>
> "Vậy check >= 22 đi, sao lại 1 cái 22.12.0 rồi 1 cái >= 22.13 làm chi vậy." (user, 2026-10-19)
>
> Chose "Một mốc >=22.22.1" over keeping two floors (user, 2026-10-19).

A literal `>=22` is not possible: commander 15 does not run below 22.12.0, and the toolchain does not
run below 22.22.1.

## Consequences

- Consumers on Node 22.12.0 to 22.22.0, releases older than 2026-03-04, are refused by the installer,
  though commander itself would run there. That is the price of one number.
- Verified locally on 2026-10-19 with the official tarballs: on 22.22.1 the full gate passes; on
  22.22.0 `pnpm install` exits 1 and `install.sh` refuses with "node >= 22.22.1 is required".
- Because CI installs on exactly the floor with `engineStrict`, a dependency upgrade that raises its
  own Node requirement above the floor fails CI at install, and the floor is raised on purpose.
- Nothing proves the newest Node lines any more. That is accepted to save CI time.
