# Codebase summary

The repository as it stands after Phase 0 and the toolchain alignment. Every entry below exists and
is reachable from a command in [../README.md](../README.md).

## Root

| Path                                                   | Purpose                                                                                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                         | Name `@jjuidev/jss-devtools`, ESM, `bin` points at `dist/cli.mjs`, scripts, `engines`, `devEngines`, `packageManager`, exact dependency pins |
| `tsconfig.json`                                        | Strict TypeScript, `NodeNext` resolution, `noEmit`                                                                                           |
| `tsdown.config.ts`                                     | Bundles `src/cli.ts` to `dist/cli.mjs`, ESM, target Node 22, runtime dependencies inlined                                                    |
| `vitest.config.ts`                                     | Node environment, `tests/**/*.test.ts`, injects the version constant, wires global setup                                                     |
| `eslint.config.mjs`                                    | Flat config: recommended plus autofix, `import-x`, `prefer-arrow-functions`, typed TS rules, Prettier                                        |
| `commitlint.config.mjs`                                | Conventional Commits                                                                                                                         |
| `.prettierrc.json`, `.prettierignore`, `.editorconfig` | Formatting: shared facts in `.editorconfig`, Prettier-only ones in `.prettierrc.json`; `plans/` and the lockfile excluded                    |
| `.vscode/settings.json`, `.vscode/extensions.json`     | Editor agreement: format on save, ESLint fix on save, recommended extensions                                                                 |
| `.husky/pre-commit`, `.husky/commit-msg`               | `lint-staged` and `commitlint`                                                                                                               |
| `pnpm-workspace.yaml`                                  | `strictPeerDependencies`, `allowBuilds`, supply-chain age allow-list                                                                         |
| `pnpm-lock.yaml`                                       | Resolved versions of all packages                                                                                                            |
| `.github/workflows/ci.yml`                             | The full check sequence on Node 24, `pnpm test` on Node 22, 24 and 26, and the bundle run on the exact `engines.node` floor                  |

There is no `.npmrc` and no `.nvmrc`. pnpm reads its settings from `pnpm-workspace.yaml`, and the
development runtime is `devEngines.runtime` in `package.json`.

## Source

| Path         | Purpose                                                                               |
| ------------ | ------------------------------------------------------------------------------------- |
| `src/cli.ts` | The only source file. Builds the commander program, owns every process-level decision |

There is no `core`, `commands` or `modules` layout yet. The module layout is a decision for the
next plan, so this phase creates only what it uses.

## Tests

| Path                                  | Purpose                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `tests/cli.test.ts`                   | In-process tests over `main()`: help, version, unknown command named and non-zero, non-zero exit on failure |
| `tests/bundle.test.ts`                | Runs the built `dist/cli.mjs` from a temp directory with no `node_modules`, directly and through a symlink  |
| `tests/architecture.test.ts`          | Proves each boundary rule has a negative fixture it detects, and that `src/` is clean                       |
| `tests/support/architecture-rules.ts` | The rule table and the source scanner                                                                       |
| `tests/support/tmp-dir.ts`            | Temp-directory helpers used by the bundle suite                                                             |
| `tests/setup/global-setup.ts`         | Runs the tsdown build once before the suites, so `pnpm test` is self-contained                              |
| `tests/fixtures/architecture/`        | One file per rule, each breaking exactly that rule                                                          |

## Docs and plans

| Path        | Purpose                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `README.md` | What exists today, requirements, development commands                                           |
| `CLAUDE.md` | Agent guidance: commands, the done-bar, the rules this repo enforces on itself                  |
| `docs/`     | Project overview, code standards, architecture, tree, roadmap, decision records                 |
| `plans/`    | Plans, journals and scout reports. Canonical working state for planning; excluded from Prettier |

## Ignored

`.agentkit/` holds AgentKit's per-machine project state and embeds absolute local paths, so it is
not committed. `dist/`, `coverage/`, `node_modules/` and `.claude/` are ignored in the usual way.
