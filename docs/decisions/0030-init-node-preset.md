---
id: 0030
title: The init node preset
status: accepted
date: 2026-10-27
---

# 0030 The init node preset

## Context

`jss-devtools init` is the toolchain command. Its scaffold shipped with the shared flags
([0029](./0029-shared-command-flags.md)); what it creates, checks, asks and writes was decided with
the user across 2026-10-22 and 2026-10-27, one case at a time. The full discussion history, with
every probe and edge case, is the
[init flow decision log](../../plans/261022-0141-init-flow-discussion/decision-log.md); this record
is what an agent reads instead of replaying it.

## Decision

**Two modes, picked by the syntax.** `init <dir>` creates a project from nothing (primary);
`init` sets up the current folder (secondary). The folder's content is checked, never used to guess
the mode. Every edge case follows the user's strategy: no mode, no merge, no prompt of its own —
exit 1, say what was found, name the next step. Monorepos are not supported; since pnpm 11 writes
`pnpm-workspace.yaml` for single packages too, that file counts as a monorepo only when it has a
top-level `packages` field.

**The node preset.** One framework, `node`, is built; `--framework` lists the whole enum
(`node`, `react`, `rn`, `next`, `nest`) and any other value exits 1. A new project gets:
`package.json`, `tsconfig.json`, `src/main.ts`, `eslint.config.mjs`, `.prettierrc.json`,
`.editorconfig`, `.gitignore`, `.prettierignore`, `commitlint.config.mjs`, `.husky/pre-commit`,
`.husky/commit-msg`, `.vscode/settings.json`, `.vscode/extensions.json` (skipped with `--no-vscode`),
and `pnpm-workspace.yaml` for pnpm only, with `allowBuilds` for `esbuild` and `unrs-resolver` plus
`strictPeerDependencies` and `engineStrict`. The folder keeps the name the user typed;
`package.json` gets an npm name derived from it: lowercase, each run of characters outside `a-z`
`0-9` `-` `.` `_` becomes one `-`, leading `.` `_` `-` and trailing `-` trimmed, at most 214
characters; nothing left exits 1 before any write, naming the folder. With pnpm 11, a missing
`allowBuilds.esbuild` makes
every install and `pnpm exec` fail with `ERR_PNPM_IGNORED_BUILDS`, so the entry ships in the
template.

**Module setup.** `type: module`; `tsconfig.json` has `module: esnext`,
`moduleResolution: bundler`, `paths: { "@/*": ["./src/*"] }` and no `baseUrl` (TypeScript 6 rejects
`baseUrl`). Imports are written without extensions; `build` is `tsc && tsc-alias --resolve-full-paths`,
which rewrites the alias and adds `.js` and `/index.js`, so plain `node dist/main.js` runs. Accepted
risk: `tsc` no longer checks paths the way Node resolves them, so a runnable `dist/` depends on
tsc-alias rewriting every import — the end-to-end test runs `node dist/main.js` for that.

**Existing mode.** Shared files (`package.json`, `.gitignore`, `.prettierignore`,
`.husky/pre-commit`, `.husky/commit-msg`, and for pnpm `pnpm-workspace.yaml`) are always merged:
missing entries added once, values the user set kept. Owned files (the ESLint, Prettier, commitlint
and `.editorconfig` configs, plus `.vscode/`) stop with exit 1 and the list; `-f, --force` replaces
them and deletes the other documented config names. Existing mode never touches `tsconfig.json`,
the alias, or the `dev`/`build` scripts, and never adds `strictPeerDependencies` or `engineStrict`
to `pnpm-workspace.yaml` — create mode only. Merging skips a preset package that is already in any
`package.json` dependency section (`dependencies`, `devDependencies`, `peerDependencies`,
`optionalDependencies`). A `pnpm-workspace.yaml` whose `allowBuilds` cannot be
extended line by line (flow style) stops in preflight naming the entries to add by hand.

**Preflight before the first write.** In order: the argument rules, package.json parse, monorepo
check, `tsconfig.json` presence, git (installed, root here, hooks not owned by another manager),
package manager (detected for existing mode, `--pm` or the question for create), version check,
owned-file conflicts. Create mode accepts yarn 1 only: a yarn major of 2 or newer exits 1, because
Plug n Play is outside the scope this preset is tested against. `git init -q -b main` runs in create
mode before the install, because
`prepare: husky` needs `.git`. After the writes, three steps can still exit 1: `git init` (create
mode), the install, and the `package.json` sort. Nothing is rolled back; each message names the
next step — the manual install, or re-running the sort bin — with the path relative to where init
ran, quoted when a shell would split or expand it, and the sort message includes the failing tool's
output (stderr, else stdout).

**Two questions, nothing else.** The package manager (create mode, when `--pm` is absent) and the
confirmation after the plan is shown. `-y, --yes` takes every default; `--dry-run` runs preflight,
shows `+`/`~`/`-` and writes nothing.

**Versions are pinned, not fetched.** The set is chosen once when the preset is written — start at
latest stable, step down until every peer range holds, pin exact versions in one table in the CLI
(`scripts/pin-node-preset.mjs` writes it). Generated manifests carry caret ranges. A pin must be
older than pnpm's `minimumReleaseAge` (1440 minutes). `@types/node` follows the major of
`engines.node`, which is the CLI's own floor `>=24.11.0`, read from `package.json` at build time.
`prettier-package-json` runs on `./package.json` in lint-staged before `prettier --write`, so the
keys are sorted and `.editorconfig` stays the only whitespace source; init also sorts the manifest
it writes, through the project's own installed copy.

## In the user's words

> "Usecase chính của CLI này chủ yếu là init repo, kiểu như vite create á." (user, 2026-10-22)

> "Quan điểm, strategy, chủ yếu focus usecase chính, case nào edge quá thì xử lý dạng exit 1 +
> thông tin, gợi ý next step." (user, 2026-10-22)

> "Chốt flow này, qua câu tiếp theo" (user, 2026-10-22 — the syntax picks the mode)

> "Chốt chỉ hỏi package manager + xác nhận" (user, 2026-10-27)

> "Đồng ý phương án merge đối với những files dùng chung. Đối với những files cần xử lý, thêm flag
> --force|-f." (user, 2026-10-27)

> "tại thời điểm mình làm nè, ưu tiên lấy latest version hết rồi pinned lại, nếu không khớp thì giảm
> hay resolve sao cho ổn định tất cả rồi pinned lại" (user, 2026-10-27)

> "6c" (user, 2026-10-27 — `type: module`, `esnext`/`bundler`, tsc-alias `--resolve-full-paths`)

> "Do dùng tsx, nên cho allowBuilds esbuild: true đi, là xong cho case này." (user, 2026-10-27)

> Asked whether existing mode should also add `strictPeerDependencies` and `engineStrict`, the user
> chose "Không thêm" (2026-10-27).

## Consequences

- The pinned version table in `src/commands/init/constants/node-preset-dependency.constant.ts` is
  written by `scripts/pin-node-preset.mjs`; rerunning it, not hand editing, is how the set moves.
- The end-to-end suite (`tests/init.e2e.test.ts`, gated behind `INIT_E2E=1` because it installs from
  the registry) is the real proof that the pinned set fits: it creates a project with each manager
  on `PATH`, then lints, typechecks, builds and runs `node dist/main.js`.
- Frameworks other than `node`, monorepos, `--harness`, `--json`, `--cwd` and rollback after a
  failed install are non-goals of this preset, recorded in the plan.
