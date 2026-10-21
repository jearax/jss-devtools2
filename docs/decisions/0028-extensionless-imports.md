---
id: 0028
title: Imports carry no file extension
status: accepted
date: 2026-10-21
---

# 0028 Imports carry no file extension

## Context

The imports carried a `.js` extension, because `moduleResolution` was `NodeNext` and that is what
Node ESM needs. The user asked for the extension to go.

`NodeNext` no longer earns its keep. `tsc` emits nothing, and the only artifact is the tsdown
bundle, which resolves every import at build time: the source specifier never reaches the artifact,
as the byte-identical bundle shows. The proof that the artifact runs is `tests/bundle.test.ts`,
which runs `dist/cli.mjs` with no `node_modules`, and the build guard from decision 0025 already
fails on an unresolved import.

## Decision

`tsconfig.json` sets `"module": "Preserve"` and `"moduleResolution": "Bundler"`, and every `@/`
and `./` import carries no file extension. ESLint rejects an extension from then on, so one cannot
come back.

This supersedes the `NodeNext` deviation in decision 0014.

## In the user's words

> "Có vấn đề với loại import mà có extension .js thay vì không có. Ví dụ: doctor.command.ts:5-9, tôi
> muốn sửa lại không import có extension file." (user, 2026-10-21)

## Evidence (probed 2026-10-21 on a worktree of `ecedcaf`, Node 24.11.0)

| Probe                                                                | Result                                                                                                                                                                               |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Extensions stripped, `NodeNext` kept                                 | `tsc` fails with 70 × TS2307 (`Cannot find module '@/commands/doctor/doctor.command'`)                                                                                               |
| Extensions stripped, `module: Preserve`, `moduleResolution: Bundler` | lint, typecheck, 96 tests and build all green                                                                                                                                        |
| Bundle before and after                                              | byte-identical: sha256 `ff7171132dd8b661…`, the same as the live site                                                                                                                |
| `runner-in-adapters-only` pattern `run-command\.util\.js`            | missed an extensionless import. The fixture still had `.js`, so the suite stayed green while the rule went blind. Fixed by `run-command\.util(?:\.js)?` and an extensionless fixture |
| ESLint `no-restricted-imports` pattern `regex: '^(?:@/               | \.{1,2}/).+\.(?:js\|ts)$'`                                                                                                                                                           | flags `@/x.js` and `./a.ts`; allows `./z`, and allows `./scripts/package-info.mjs` in `tsdown.config.ts`, which Node loads directly and which needs its extension |

## Consequences

- The `runner-in-adapters-only` rule sees both spellings, and its fixture carries no extension, so
  the rule cannot go blind again.
- A `.mjs` import in a root config file is still allowed: Node loads those files directly and needs
  the extension.
- `Bundler` resolution accepts an import that plain Node ESM refuses. That only matters if a `.ts`
  file is ever run by Node without the bundler, and today only vitest (Vite) and tsdown read the
  source.
