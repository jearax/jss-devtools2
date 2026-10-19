---
id: 0015
title: No .npmrc and no .nvmrc
status: accepted
date: 2026-10-19
---

# 0015 No `.npmrc` and no `.nvmrc`

## Context

Phase 0 shipped a `.npmrc` holding `engine-strict` and `strict-peer-dependencies`, and a `.nvmrc`
holding `24`. Both files restated a fact that belongs somewhere with better tooling support.

## Decision

Neither file exists.

- `.npmrc` is gone. pnpm reads only auth and registry settings from `.npmrc`; every other setting
  comes from `pnpm-workspace.yaml`. `strict-peer-dependencies` moved there as
  `strictPeerDependencies`.
- `.nvmrc` is gone. The development runtime is declared once, in `package.json`, as
  `devEngines.runtime`: `node`, `>=22.13.0`, `onFail: error`. `pnpm/setup` reads the field and
  installs a matching Node in CI.

## In the user's words

> "IMHO, npmrc, nvmrc gộp vào package.json nếu có thể." (user, 2026-10-19)
>
> "approve >=22" (user, 2026-10-19), approving widening the range from `^24.11.0` to a `>=22` floor.

The user's phrasing was conditional: merge them if it is possible. It is possible.

## The two floors are not the same number

| Floor       | Value           | Set by                                                       |
| ----------- | --------------- | ------------------------------------------------------------ |
| Consumer    | Node >= 22.12.0 | commander 15, the only runtime dependency the CLI ships      |
| Development | Node >= 22.13.0 | ESLint 10, which declares `^20.19.0 \|\| ^22.13.0 \|\| >=24` |

CI proved this on the first push of the wider range: at `>=22.12.0`, `engineStrict` checked
dependencies against 22.12.0 and ESLint refused it. The two floors are separate facts, so they are
stated separately rather than rounded to one number.

## Consequences

- `onFail: error` means the declared development floor is enforced, not advisory. A developer on
  Node older than 22.13 fails at install instead of debugging a confusing runtime error.
- `onFail: download` was tried first and rejected. With it, pnpm resolves the range to a concrete
  release and installs it: `^24.0.0` resolved to Node 24.0.0, which `engineStrict` then refused
  against tsdown's `^24.11.0` requirement.
- `engineStrict` was removed for the same underlying reason. pnpm checks dependency engines against
  a version it resolves from the declared range rather than the Node actually running, so any range
  gets validated at one of its boundaries. A range floor and an engine check are the wrong
  combination. Nothing is lost: pnpm always fails an install when the project's own `engines.node`
  does not match the running Node, whatever `engineStrict` is set to.
- The declared floor and the CI target are different facts, so both are stated. `devEngines.runtime`
  is the floor a developer may use; the `checks` job pins `runtime: node@24` so the job that gates
  merges cannot silently drift to whatever the newest Node happens to be. The matrix covers 22, 24
  and 26.

## Later

Decision 0022 removed `devEngines` and restored `engineStrict`, now that a single floor of
`>=22.22.1` satisfies every dependency's engines. The claim above that pnpm fails an install on the
project's own `engines.node` whatever `engineStrict` is set to was wrong: pnpm 11.24.0 only warns
([0022](./0022-one-node-floor.md)).
