# Codebase summary

The repository as it stands after the core layout and the first command. Every entry below exists
and is reachable from a command in [../README.md](../README.md).

## Root

| Path                                                   | Purpose                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `package.json`                                         | Name `@jjuidev/jss-devtools`, ESM, `bin` points at `dist/cli.mjs`, scripts, `engines`, `packageManager`, exact dependency pins |
| `tsconfig.json`                                        | Strict TypeScript, `NodeNext` resolution, the `@/` alias to `src/`, `noEmit`                                                   |
| `tsdown.config.ts`                                     | Bundles `src/cli.ts` to `dist/cli.mjs`, ESM, target Node 24, runtime dependencies inlined                                      |
| `vitest.config.ts`                                     | Node environment, `tests/**/*.test.ts`, injects the package facts, resolves the alias, wires global setup                      |
| `eslint.config.mjs`                                    | Flat config: recommended plus autofix, `import-x`, `prefer-arrow-functions`, typed TS rules, Prettier, the `../` import ban    |
| `commitlint.config.mjs`                                | Conventional Commits                                                                                                           |
| `.prettierrc.json`, `.prettierignore`, `.editorconfig` | Formatting: shared facts in `.editorconfig`, Prettier-only ones in `.prettierrc.json`; `plans/` and the lockfile excluded      |
| `.vscode/settings.json`, `.vscode/extensions.json`     | Editor agreement: format on save, ESLint fix on save, recommended extensions                                                   |
| `.husky/pre-commit`, `.husky/commit-msg`               | `lint-staged` and `commitlint`                                                                                                 |
| `pnpm-workspace.yaml`                                  | `strictPeerDependencies`, `allowBuilds`, supply-chain age allow-list                                                           |
| `pnpm-lock.yaml`                                       | Resolved versions of all packages                                                                                              |
| `.github/workflows/ci.yml`                             | The full check sequence on exactly the `engines.node` floor, the site image, and the Dokploy deploy                            |
| `.dockerignore`                                        | Allow-list of what reaches the site image build context                                                                        |
| `.gitignore`                                           | `dist/`, `release/` and the usual artifacts                                                                                    |

There is no `.npmrc` and no `.nvmrc`. pnpm reads its settings from `pnpm-workspace.yaml`, and the
only Node floor is `engines.node` in `package.json`, which `engineStrict` enforces at install.

## Source

| Path                                 | Purpose                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/cli.ts`                         | The entry point: builds the commander program, registers the module commands, owns the exit code                                             |
| `src/core/constants/`                | `banner.constant.ts`, the JSS art and the platform names; `exit-code.constant.ts`, the exit codes; `package.constant.ts`, the package facts  |
| `src/core/errors/cli.error.ts`       | `CliError`, a failure with an exit code and a fix hint                                                                                       |
| `src/core/ui/banner.ui.ts`           | The banner: the art with the name, the version, the description and the platform beside it                                                   |
| `src/core/ui/terminal.ui.ts`         | The terminal layer: plain lines when piped, the animated spinner on a terminal, errors on stderr                                             |
| `src/core/ui/animated-spinner.ui.ts` | The frames of the animated spinner, drawn here so the layer owns no process state                                                            |
| `src/core/ui/check-list.ui.ts`       | The check list: one aligned row per check, with the fix hint nested under its row                                                            |
| `src/core/utils/run-command.util.ts` | The only spawner: `execFile` without a shell, and a missing command as a result, not a throw                                                 |
| `src/core/utils/version.util.ts`     | Parses a version and compares two of them numerically                                                                                        |
| `src/core/adapters/git.adapter.ts`   | The only file that knows git's command line                                                                                                  |
| `src/commands/doctor/`               | The first command: `doctor.command.ts` wires it, `doctor.service.ts` runs the checks, `checks/` holds one file per check, `types/` the types |

`core/` is shared and imports no command; `commands/` holds one folder per command. A file name
says what the file is, and the architecture suite enforces it. The rules are in
[0024](./decisions/0024-core-and-command-layout.md) and
[code-standards.md](./code-standards.md).

## Install and release

| Path                        | Purpose                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `scripts/install.sh`        | POSIX installer: checks the Node floor, downloads, verifies sha256, writes the wrapper          |
| `scripts/stage-release.mjs` | Stages `dist/cli.mjs` and its checksums into `release/`, the format `install.sh` reads          |
| `scripts/package-info.mjs`  | Reads the name, description, version and Node floor from `package.json`, once                   |
| `docker/Dockerfile`         | `nginx:1.30.6-alpine` pinned by digest; copies config, page, installer, bundle; runs `nginx -t` |
| `docker/nginx.conf`         | The routing table: `/` home, `/install.sh`, `/releases/latest/`, 404 for everything else        |
| `docker/home.html`          | The temporary home page: install command, Node requirement, repository link, no version         |
| `docker/docker-compose.yml` | The service Dokploy runs: `pull_policy: always`, Traefik labels, healthcheck                    |
| `ci/smoke-site-image.sh`    | Proves the routing table against a running image and installs from it end to end                |

`release/` is git-ignored staging between `pnpm stage:release` and the image build.

## Tests

| Path                                  | Purpose                                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/cli.test.ts`                   | In-process tests over `main()`: help, version, unknown command named and non-zero, non-zero exit on failure                                               |
| `tests/doctor.service.test.ts`        | The doctor checks with a fake context: all pass, Node below the floor, git missing, git failing, not a repository                                         |
| `tests/version.util.test.ts`          | Version parsing and numeric comparison                                                                                                                    |
| `tests/run-command.util.test.ts`      | The command runner: the output, the exit code, and a command that does not exist                                                                          |
| `tests/git-adapter.test.ts`           | The git adapter against a temporary repository, a temporary directory that is not one, and a stub that fails                                              |
| `tests/banner.test.ts`                | The banner: the info column lines up, it fits in eighty columns, and it shows on a terminal only                                                          |
| `tests/terminal-ui.test.ts`           | The terminal layer: plain lines and no escape byte when piped, an animated spinner on a terminal, errors on stderr                                        |
| `tests/check-list.ui.test.ts`         | The check list: the labels line up, the hint sits under its row, and no escape byte when piped                                                            |
| `tests/bundle.test.ts`                | Runs the built `dist/cli.mjs` from a temp directory with no `node_modules`, directly and through a symlink, and runs `doctor` in and out of a repository  |
| `tests/install.test.ts`               | Runs `scripts/install.sh` against a local release server: the good path, a checksum mismatch, a Node below the floor, and the floor equals `engines.node` |
| `tests/architecture.test.ts`          | Proves each boundary rule has a negative fixture it detects, and that `src/` is clean                                                                     |
| `tests/support/architecture-rules.ts` | The rule table and the source scanner                                                                                                                     |
| `tests/support/capture-stream.ts`     | Captures what a stream receives, so a test can assert on output it would otherwise print                                                                  |
| `tests/support/tmp-dir.ts`            | Temp-directory helpers used by the bundle suite                                                                                                           |
| `tests/setup/global-setup.ts`         | Runs the tsdown build once before the suites, so `pnpm test` is self-contained                                                                            |
| `tests/fixtures/architecture/`        | One file per rule, each breaking exactly that rule, under a tree that mirrors `src/`                                                                      |

## Docs and plans

| Path        | Purpose                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `README.md` | What exists today, requirements, install, development commands                                    |
| `CLAUDE.md` | Agent guidance: commands, the done-bar, the rules this repo enforces on itself                    |
| `docs/`     | Project overview, code standards, architecture, tree, roadmap, deployment guide, decision records |
| `plans/`    | Plans, journals and scout reports. Canonical working state for planning; excluded from Prettier   |

## Ignored

`.agentkit/` holds AgentKit's per-machine project state and embeds absolute local paths, so it is
not committed. `dist/`, `coverage/`, `node_modules/` and `.claude/` are ignored in the usual way.
