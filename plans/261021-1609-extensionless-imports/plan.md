---
title: "Extensionless imports"
description: "Drop the .js extension from @/ and ./ imports by switching TypeScript to Bundler resolution; ESLint rejects an extension from then on, and the architecture scanner matches both spellings."
status: done
priority: P2
effort: 1h
branch: main
tags: [build, lint, imports]
blockedBy: []
blocks: []
created: 2026-10-21
---

# Extensionless imports

## Input from the user (2026-10-21)

> "Có vấn đề với loại import mà có extension .js thay vì không có. Ví dụ: doctor.command.ts:5-9, tôi
> muốn sửa lại không import có extension file."

## Evidence (probed 2026-10-21 on a worktree of `ecedcaf`, Node 24.11.0)

| Probe | Result |
|---|---|
| Extensions stripped, `NodeNext` kept | `tsc` fails with 70 × TS2307 (`Cannot find module '@/commands/doctor/doctor.command'`) |
| Extensions stripped, `module: Preserve`, `moduleResolution: Bundler` | lint, typecheck, 96 tests and build all green |
| Bundle before and after | byte-identical: sha256 `ff7171132dd8b661…`, the same as the live site |
| `runner-in-adapters-only` pattern `run-command\.util\.js` | **misses an extensionless import**. The fixture still had `.js`, so the suite stayed green while the rule went blind. Fixed by `run-command\.util(?:\.js)?` and an extensionless fixture |
| ESLint `no-restricted-imports` pattern `regex: '^(?:@/\|\\.{1,2}/).+\\.(?:js\|ts)$'` | flags `@/x.js` and `./a.ts`; allows `./z`, and allows `./scripts/package-info.mjs` in `tsdown.config.ts`, which Node loads directly and which needs its extension |

Why `NodeNext` no longer earns its keep (decision 0014's reason): `tsc` emits nothing, and the
only artifact is the tsdown bundle, which resolves every import at build time. The source specifier
never reaches the artifact, as the byte-identical bundle shows. The proof that the artifact runs is
`tests/bundle.test.ts`, which runs `dist/cli.mjs` with no `node_modules`. The build guard from
decision 0025 already fails on an unresolved import.

## Steps

- [x] `tsconfig.json`: set `"module": "Preserve"` and `"moduleResolution": "Bundler"`. **Done
      (2026-10-21).**
- [x] Strip `.js` from every `@/` and `./` specifier in `src/`, `tests/` and `scripts/*.d.mts`, and
      from the `../` specifiers under `tests/fixtures/`. Keep `.mjs` specifiers. **Done (2026-10-21).**
      27 files.
- [x] `eslint.config.mjs`: add a second `no-restricted-imports` pattern, next to the `../*` one:
      `{ regex: '^(?:@/|\\.{1,2}/).+\\.(?:js|ts)$', message: 'Import without the file extension.' }`.
      **Done (2026-10-21).** A temporary `@/x.js` and a temporary `./a.ts` both fail `pnpm lint` with
      that message, and `./scripts/package-info.mjs` is still allowed.
- [x] `tests/support/architecture-rules.ts`: make `runner-in-adapters-only` match
      `run-command\.util(?:\.js)?['"]`. Grep the file for any other `.js` in a pattern. **Done
      (2026-10-21).** It was the only one, and the fixture now carries no extension and still trips
      its rule.
- [x] Docs:
      - `docs/code-standards.md` § TypeScript: Bundler resolution, imports carry no extension, and why;
      - `docs/codebase-summary.md`: the tsconfig row;
      - decision 0025: the extension bullet points to the new decision;
      - decision 0014: the `NodeNext` bullet is marked superseded by the new decision;
      - new decision `0028-extensionless-imports.md` with the user's quote and the evidence above.
      **Done (2026-10-21).**
- [x] No comments. **Done (2026-10-21).**

## Acceptance criteria

- `git grep -nE "from '(@/|\./|\.\./)[^']+\.js'" -- src tests scripts` prints nothing. **True on
  2026-10-21.**
- A temporary `@/x.js` import fails `pnpm lint` with "Import without the file extension". **True on
  2026-10-21.**
- The `runner-in-adapters-only` fixture has no extension and still fails its rule. **True on
  2026-10-21.**
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green on Node 24.11.0. **True on
  2026-10-21:** lint, typecheck, 112 tests in 14 files, build, format.
- The bundle logic is unchanged: sorted-line diff against the pre-change build is 0. **True on
  2026-10-21:** the sorted-line diff is 0 and the bundle is byte-identical, sha256 `c4a5c77195e16984…`.

## Non-goals

- Changing `.mjs` imports in root config files or `scripts/`.
- Any runtime change.

## Risk

- `Bundler` resolution would accept an import that plain Node ESM refuses. That only matters if a
  `.ts` file is ever run by Node without the bundler. Today only vitest (Vite) and tsdown read the
  source, and both resolve extensionless imports.

## Outcome

Done on 2026-10-21. An import names the file, not the file with its extension, and the artifact is
the same bytes as before. ESLint now rejects an extension, and the architecture rule that matches
the command runner matches both spellings, so it cannot go blind again.
