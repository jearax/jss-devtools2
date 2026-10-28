# System architecture

What the code does today. The source layout was decided in
[0024](./decisions/0024-core-and-command-layout.md) and the exit codes in
[0023](./decisions/0023-exit-codes.md).

## Source layout

```
src/
├─ cli.ts                     the program, the exit code, the global handlers
├─ core/                      shared; imports no command and no commander
│  ├─ adapters/git.adapter.ts the only file that knows git's command line
│  ├─ constants/              the banner art, the exit codes, the package facts, the shared flags
│  ├─ errors/cli.error.ts     an expected failure with an exit code and a hint
│  ├─ ui/                     the banner, the terminal layer, the check list, the spinner frames
│  └─ utils/                  the command runner, the version comparison
└─ commands/
   ├─ doctor/                 one folder per command
   │  ├─ doctor.command.ts    commander wiring and rendering
   │  ├─ doctor.service.ts    the checks, no I/O
   │  ├─ checks/              one file per check
   │  └─ types/               the types the command shares
   └─ init/                   one folder per command
      ├─ init.command.ts      commander wiring, the questions, the shared flags, the help examples
      ├─ init.service.ts      the argument rules and the mode
      ├─ preflight.service.ts the checks that run before the first write
      ├─ plan.service.ts      the file plan for create and existing mode
      ├─ merge.service.ts     the shared-file merges (package.json, ignore files, hooks, pnpm-workspace.yaml)
      ├─ write.service.ts     applies the plan: git init, the writes, the deletions
      ├─ constants/           the pinned version table and the config-name table
      ├─ templates/           the content of one generated file, per file
      └─ types/               the types the command shares
```

A file name says what the file is: `.command.ts`, `.ui.ts`, `.service.ts`, `.check.ts`,
`.adapter.ts`, `.util.ts`, `.constant.ts`, `.error.ts`, `.type.ts`. The table and the rules are in
[0024](./decisions/0024-core-and-command-layout.md) and
[code-standards.md](./code-standards.md).

The rules are enforced by the architecture suite, and each rule has a negative fixture that breaks
exactly that rule:

| Id                                               | Rule                                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `file-role-suffix`                               | Every file under `src/` except `cli.ts` has a suffix from the table, in its folder                  |
| `core-imports-no-command`                        | `src/core/**` never imports from `src/commands/**`                                                  |
| `command-imports-no-other-command`               | `src/commands/<a>/**` never imports `src/commands/<b>/**`; logic two commands share goes to `core/` |
| `commander-in-command-files-only`                | `commander` only in `*.command.ts` and `cli.ts`                                                     |
| `clack-in-ui-layer-only`                         | `@clack/prompts` only in `*.ui.ts`, `*.command.ts` and `cli.ts`                                     |
| `output-in-ui-layer-only`                        | `process.stdout`, `process.stderr`, `console.` only in `*.ui.ts`, `*.command.ts` and `cli.ts`       |
| `child-process-in-runner-only`                   | `node:child_process` only in `core/utils/run-command.util.ts`                                       |
| `runner-in-adapters-only`                        | the command runner is called only by an adapter                                                     |
| `no-process-exit-outside-entry-point`            | `process.exit` only in `cli.ts`                                                                     |
| `no-global-process-handlers-outside-entry-point` | global process handlers only in `cli.ts`                                                            |

## Entry point

`src/cli.ts` builds the program and owns every process-level decision. A module attaches a command
to it; it never replaces it.

```
node dist/cli.mjs --help
  -> src/cli.ts  main()
       -> createProgram()        builds a commander program, runs nothing
       -> registerDoctorCommand()  attaches the command folders
       -> program.parseAsync()    commander writes help, version, errors and exit codes
```

Four exports, each with one job:

- `createProgram(options)` builds the program without running it, so tests can drive it in-process.
  `options.exitOverride` makes commander reject instead of exiting, which is how the exit codes are
  tested without killing the test runner.
- `main(argv, options)` runs a program and owns the single exit path for anything that escapes a
  command handler.
- `reportFatalError(error)` writes one line to stderr, adds the stack when `JSS_DEBUG=1`, and sets
  `process.exitCode = 1`.
- `runProgram(program, argv)` parses and turns whatever escapes into an exit code. It is exported
  so a test can run a program that throws, which is how the `CliError` path is covered.

Commander reports an unknown command itself now that a subcommand exists, so `src/cli.ts` no longer
carries a fallback for it. `main` runs only when the module is the process entry. The check resolves
`process.argv[1]` with `realpathSync` before comparing it with `import.meta.filename`, because bin
shims and installers run the CLI through a symlink: unresolved, the two paths differ and the CLI
would do nothing and exit 0.

## Terminal output

`src/core/ui/terminal.ui.ts` is the only place that renders the terminal, and it owns the cases
`@clack/prompts` does not cover. The library was measured against inquirer, listr2, ora and ink on
2026-10-20; the measurement is in
[the research report](../plans/reports/researcher-261020-0023-tui-framework.md) and the decision in
[0004](./decisions/0004-cli-parser-and-prompts.md).

| Primitive            | On a terminal outside CI                                                                                           | Piped, captured or in CI                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `createSpinner()`    | the animated spinner                                                                                               | `log.step` at the start, `log.success` or `log.error` at the end |
| `runTasks()`         | one animated spinner per task                                                                                      | one `log.step` per task, a result line after it                  |
| `createTaskLog()`    | clack `taskLog`, the last 5 lines, dim                                                                             | `log.step` title, every line prefixed `│  `, `log.step` summary  |
| `renderError(error)` | `log.error` on stderr, the hint under it, or `To finish:` and the `$` command list when the error carries commands | the same                                                         |
| prompts              | not written yet                                                                                                    | not written yet                                                  |

`isInteractive(context)` is the one rule for the output: stdout is a terminal with a usable width
(zero or unknown columns counts as not interactive) and no CI marker is set. Clack writes cursor codes even when the output is piped, so the animated primitives never run
outside a terminal. The prompt guard, which refuses to prompt when there is no terminal to answer,
ships with the first prompt: on a closed stdin a clack prompt never settles and the process exits 13
without a message ([bombshell-dev/clack#615](https://github.com/bombshell-dev/clack/issues/615)).
That guard also asks whether stdin is a terminal, which is a different question from the one this
rule answers.

A failed task ends the run and the failure is passed on. The task list says which task failed; the
reason belongs to the error path, which renders it on stderr, so the message never lands on stdout.

Colour is Node's, not the layer's: `styleText` decides from the environment and from stdout, so a
run with `FORCE_COLOR` set keeps its colour codes and a run with `NO_COLOR` set loses them. The
layer only guarantees that the animation, and with it the cursor codes, never reaches a piped
output.

The animated spinner is drawn in `src/core/ui/animated-spinner.ui.ts` and not by clack. Clack's
spinner registers global process handlers while it runs: the `unhandledRejection` one swallows a
detached rejection, so the process ends with exit 0, and the `SIGINT` one makes Ctrl+C print
"Canceled" and carry on. Measured on 2026-10-20, on the same task and with only the branch
differing. The layer therefore owns no process state at all: no handlers, no hidden cursor, and
Ctrl+C ends the CLI the way it ends any other program. The frames and the colours are clack's, so
the look is the same.

`CliError` carries the exit code, the hint that says what to do about the failure, and an optional
list of commands to run next, rendered as `$` lines under `To finish:` — the same list the init
outro renders under `Next steps`. `src/cli.ts` renders it through `renderError` and ends with its
exit code. An unexpected error is a crash, not
an expected failure: it stays a bare line on stderr, with the stack under `JSS_DEBUG=1`.

## Banner

`src/core/ui/banner.ui.ts` draws the JSS block letters from
`src/core/constants/banner.constant.ts`, with the name, the version, the description, the Node
version and the platform in a column beside them. The art is six lines of 24 columns, so the whole
banner fits in 80 columns.

`src/cli.ts` puts it above the root help and above `--version, -v`, on a terminal only: the help hook
returns it when the help is not an error, and a listener registered before `.version()` writes it
before the version. Piped, captured or in CI there is no banner, so `--version` is exactly
`x.y.z`, which is what `scripts/install.sh` reads.

## Package facts

`src/cli.ts` holds no package literal. `scripts/package-info.mjs` reads `package.json` once and
returns the name the CLI is called by, its description, its version and the Node floor;
`tsdown.config.ts` and `vitest.config.ts` inject that object as `__JSS_PACKAGE__`, and
`src/core/constants/package.constant.ts` is the only place that declares it and exports it as
`PACKAGE`. The banner builds its info from `PACKAGE` once, in `src/core/ui/banner.ui.ts`, so every
command shows the same banner.

## The doctor command

`jss-devtools doctor` is the first command, and it is the shape the others follow: the command
folder holds the wiring, the service, the checks and the types, and `core/` holds everything
shared.

It runs three checks in a fixed order and reports each with its id, its detail and, when it fails,
the fix:

| Id               | What it checks                                                          |
| ---------------- | ----------------------------------------------------------------------- |
| `node.version`   | the running Node against `PACKAGE.nodeFloor`                            |
| `git.installed`  | the adapter's version, failing with an install hint when git is missing |
| `git.repository` | whether the working directory is inside a work tree                     |

`git --version` runs once, before the checks, and its outcome is in the context: git that is not
installed, git that exits non-zero and git that answers are three different results, and only the
third passes `git.installed`. The repository check reads the same outcome, so a missing git is
reported once: `git.repository` is skipped, with no second install hint.

A failed check is a result, not an exception: the service runs every check and returns the results
in order. The command renders them through clack and ends with a `CliError` when any failed, so the
failure reaches stderr and the exit code is 1. On a terminal the command opens with the banner, the
same as the root help.

## The init command

`jss-devtools init` is the toolchain command, shipping the `node` preset
([0030](./decisions/0030-init-node-preset.md)). `init <dir>` creates a TypeScript node project;
`init` sets up the current one. The syntax picks the mode; every edge case exits 1 with the finding
and the next step.

A run moves through services in one direction:

```
validateInitArguments -> preflightInit -> buildInitPlan -> renderPlan -> confirm -> applyInitPlan -> installPackages -> sort
```

`preflightInit` runs every check before the first write: the mode's argument rules, package.json,
the monorepo check (`pnpm-workspace.yaml` counts only with a top-level `packages` field),
`tsconfig.json`, git (installed, root here, hooks not owned by another manager), the package
manager (detected in existing mode), and the owned-file conflicts. `buildInitPlan` turns the
preflight into `+` create, `~` update and `-` delete entries; existing mode merges the shared files
(package.json scripts and devDependencies, the ignore lists, the husky hooks, and for pnpm
`pnpm-workspace.yaml`, where only `allowBuilds` entries are managed) and replaces the owned configs,
whose other documented names are deleted with `-f`. `applyInitPlan` writes creates and updates
first, deletions last; in create mode it makes the folder and `git init -q -b main` before them.
The install runs under `createTaskLog`, which keeps the last 5 dim lines on a terminal and
collapses them into `Installed with <pm> (<seconds>s)`; piped, every line the package manager
prints is kept with the `│  ` prefix. A failed install retains the whole log, then the error path
reports on stderr. `prettier-package-json` and `prettier` then sort the manifest through the
project's own local bins, under a `Sorted package.json` task.

The file contents live in `templates/`, one export per file, and the pinned devDependency versions
in `constants/node-preset-dependency.constant.ts`, written by `scripts/pin-node-preset.mjs`.

The flags are declared once, as plain data in `src/core/constants/common-option.constant.ts`, and a
command attaches the ones it needs in its own `*.command.ts`. Core holds no commander import,
because only a command file may import commander.

| Flag                 | Meaning                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `--yes, -y`          | Skip the questions and use the defaults                                            |
| `--dry-run`          | Run preflight, show `+`, `~` and `-`, then the command that applies, write nothing |
| `--force, -f`        | Replace the configs init owns, and delete their other documented names             |
| `--pm <name>`        | Package manager for a new project; detected in existing mode, where it exits 1     |
| `--framework <name>` | Preset to apply; only node for now                                                 |
| `--no-vscode`        | Do not write `.vscode/`                                                            |
| `--help, -h`         | commander's usage and options, plus an `Examples` section                          |

`doctor` asks nothing, so it has neither shared flag, and `jss-devtools doctor --yes` is an unknown
option. The contracts of the flags are in
[0029](./decisions/0029-shared-command-flags.md); the full init decision record is
[0030](./decisions/0030-init-node-preset.md), and the discussion history is the
[init flow decision log](../plans/261022-0141-init-flow-discussion/decision-log.md).

## Exit codes

| Situation                                   | Exit code |
| ------------------------------------------- | --------- |
| Help or version                             | 0         |
| Success                                     | 0         |
| No command                                  | 0         |
| Unknown command, bad option, failed command | 1         |
| Unhandled error escaping a command handler  | 1         |

Nothing in this repository may turn a failure into a success. The previous release of this CLI
installed a global `uncaughtException` handler that did exactly that, so process exit and global
process handlers are limited to `src/cli.ts` and enforced by a test.

## Running without a command

`jss-devtools` with no argument is the same as `jss-devtools --help`: the help on stdout, the
banner on a terminal, and exit 0. Commander would show the help on stderr and exit 1, because a
subcommand is required, so `src/cli.ts` takes the help path itself before it parses.

## Unknown commands

Commander reports an unknown command itself once the program has subcommands, and offers a "Did you
mean" suggestion when there is something to suggest. `jss-devtools nope` therefore exits 1 and names
the command, with the suggestion commander builds from the registered commands.

`src/cli.ts` carried a fallback for this while the program had no subcommands, because commander
reports "too many arguments" in that case. `doctor` is the first command, so the fallback is gone.

## Build

tsdown produces a single file, `dist/cli.mjs`:

| Setting              | Value                           | Why                                                                                     |
| -------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| Format               | ESM                             | `type: module`, and Node runs ESM natively                                              |
| Platform / target    | node, Node 24                   | The major line of the Node floor                                                        |
| `deps.alwaysBundle`  | Every package in `dependencies` | Native install ships no `node_modules`                                                  |
| `inputOptions.onLog` | `UNRESOLVED_IMPORT` is an error | An import that does not resolve fails the build instead of warning into a broken bundle |
| `define`             | `__JSS_PACKAGE__`               | The package facts come from `package.json` at build time, never a second hardcoded copy |

`tsdown.config.ts` reads `package.json` and derives both the version and the list of dependencies to
inline, so adding a runtime dependency cannot silently leave it external.

## Test strategy

`pnpm test` is self-contained: a vitest `globalSetup` runs the tsdown build once, then the suites run.

| Suite                         | Question it answers                                                           |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `tests/cli.test.ts`           | Does the program produce the right output and the right exit code?            |
| `tests/check-list.ui.test.ts` | Does the check list align its rows and nest the hint under its row?           |
| `tests/terminal-ui.test.ts`   | Does the terminal layer stay plain when the output is piped?                  |
| `tests/init.command.test.ts`  | Does init print its help byte for byte, and handle the flag and mode paths?   |
| `tests/init.e2e.test.ts`      | Does a created project lint, typecheck, build and run with each manager?      |
| `tests/bundle.test.ts`        | Does the shipped file work on a machine with no `node_modules`?               |
| `tests/install.test.ts`       | Does the served installer install a working CLI, and refuse what it must?     |
| `tests/architecture.test.ts`  | Are the boundary rules still true, and do the rules still detect a violation? |

The init end-to-end suite needs the network for its installs and every package manager on `PATH`,
so it runs alone with `INIT_E2E=1 pnpm vitest run tests/init.e2e.test.ts` and reports skipped in
the default `pnpm test`; npm and pnpm are required, yarn 1 and bun are skipped when missing.

The bundle suite copies `dist/cli.mjs` into an OS temp directory and runs it there. A temp directory
outside the repository is the point: inside the repo, Node would resolve `node_modules` by walking
up and the test would prove nothing. It also runs the bundle through a symlink, which is how an
installed CLI is reached.

The install suite starts a Node `http` server on 127.0.0.1 that serves the built bundle and a
checksums file under the same paths the site serves them at, then runs `scripts/install.sh` with a
temp `HOME`, base URL and bin dir. The mismatch case proves the failure leaves no install behind,
and the old-Node case runs the installer with a fake `node` that reports v18, proving the floor is
checked before anything is downloaded.

CI runs every suite on one Node, the exact version in `engines.node`, so the bundle suite's direct
and symlinked runs prove the shipped bundle on the oldest Node anyone may use.

Architecture rules are data, not prose. `tests/support/architecture-rules.ts` holds the rule table,
each rule carries a fixture path, and the suite asserts both directions: `src/` is clean, and each
fixture trips exactly its own rule. Adding a boundary means adding a row and a broken file.

## Version constant

`__JSS_VERSION__` is injected by both `tsdown.config.ts` and `vitest.config.ts`, so the tests
assert against the same value the build ships instead of a copy that can drift.

## Install site and deploy

One nginx image carries the install path end to end, and the server never builds:

```
push to main
  -> CI gate (checks, on the exact Node floor)
  -> image job:  stage release/ -> build -> smoke the container -> push GHCR
  -> deploy job: POST the push event to the Dokploy webhook
       -> Dokploy: pull :latest, run docker/docker-compose.yml behind Traefik
```

- `scripts/install.sh` checks the Node floor (`MIN_NODE_VERSION`, equal to `engines.node`), downloads
  `cli.mjs` and `checksums.txt` from `$JSS_DEVTOOLS_BASE_URL`, verifies the sha256, runs
  `node cli.mjs --version`, and only then writes the bundle and the wrapper. Everything runs inside
  `main "$@"`, the last line, so a truncated `curl | sh` runs nothing.
- `scripts/stage-release.mjs` is the one writer of the checksum format the installer reads.
- `docker/Dockerfile` copies the built bundle; `docker/nginx.conf` is the routing table: the home
  page at `/`, the installer and the release files, and 404 for everything else.
- `docker/docker-compose.yml` is what Dokploy runs: external `dokploy-network`, `pull_policy:
always`, Traefik labels for `jss-devtools.jjuidev.com`, `wget` healthcheck.
- `ci/smoke-site-image.sh` proves the routing table against a running image and installs from it end
  to end; the CI `image` job runs it before anything is pushed.

The details, the one-time setup and rollback are in
[deployment-guide.md](./deployment-guide.md). The decisions behind the shape are
[0018](./decisions/0018-javascript-bundle-artifact.md),
[0019](./decisions/0019-artifact-lives-in-the-site-image.md),
[0020](./decisions/0020-version-0-0-1-during-development.md) and
[0021](./decisions/0021-temporary-nginx-home-and-install-script-location.md).

## Where each fact is declared

One fact, one home. Nothing is written twice in two files that can drift.

| Fact                           | Declared in                                        | Read by                                                                  |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------ |
| CLI name, description, version | `package.json`, read by `scripts/package-info.mjs` | `__JSS_PACKAGE__`, injected by `tsdown.config.ts` and `vitest.config.ts` |
| Import alias                   | `tsconfig.json` `paths`, `@/*` to `src/*`          | every import that leaves its folder, ESLint, the architecture scanner    |
| Dependencies to inline         | `package.json` `dependencies`                      | `tsdown.config.ts` `deps.alwaysBundle`                                   |
| Runtime dependencies bundled   | Same list                                          | `tests/bundle.test.ts`, as the real guard                                |
| Node floor                     | `package.json` `engines.node`, `>=24.11.0`         | pnpm (`engineStrict`), consumers, both CI jobs, `PACKAGE.nodeFloor`      |
| Interactive-terminal rule      | `src/core/ui/terminal.ui.ts` `isInteractive`       | the terminal layer                                                       |
| Banner art                     | `src/core/constants/banner.constant.ts`            | `src/core/ui/banner.ui.ts`                                               |
| Exit codes                     | `src/core/constants/exit-code.constant.ts`         | `CliError`, the commands that end with their own code                    |
| Installer and home-page floor  | `scripts/install.sh`, `docker/home.html`           | `tests/install.test.ts`, which proves both equal the floor               |
| Release checksum format        | `scripts/stage-release.mjs`                        | `scripts/install.sh`                                                     |
| Site routing table             | `docker/nginx.conf`                                | `ci/smoke-site-image.sh`, as the real guard                              |
| Package manager                | `package.json` `packageManager`                    | `pnpm/setup` in CI, pnpm locally                                         |
| Shared formatting              | `.editorconfig`                                    | Prettier, EditorConfig-aware editors                                     |
| Other formatting               | `.prettierrc.json`                                 | Prettier, `pnpm lint`, `pnpm format:check`                               |
| pnpm behaviour                 | `pnpm-workspace.yaml`                              | pnpm                                                                     |

There is one Node floor, and CI reads it from `package.json` and installs exactly that version
instead of naming a version in the workflow. See
[decisions/0022](./decisions/0022-one-node-floor.md).
