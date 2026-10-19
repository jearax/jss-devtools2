# System architecture

What the code does today. A leaner arrangement is under discussion and is not yet adopted; see the
proposal in [../plans/reports/brainstorm-261019-1038-jss-devtools-lean-redesign.md](../plans/reports/brainstorm-261019-1038-jss-devtools-lean-redesign.md).

## Entry point

`src/cli.ts` is the whole program, and it is the only place allowed to make process-level decisions.

```
node dist/cli.mjs --help
  -> src/cli.ts  main()
       -> createProgram()        builds a commander program, runs nothing
       -> program.parseAsync()    commander writes help, version, errors and exit codes
```

Three exports, each with one job:

- `createProgram(options)` builds the program without running it, so tests can drive it in-process.
  `options.exitOverride` makes commander reject instead of exiting, which is how the exit codes are
  tested without killing the test runner.
- `main(argv, options)` runs a program and owns the single exit path for anything that escapes a
  command handler.
- `reportFatalError(error)` writes one line to stderr, adds the stack when `JSS_DEBUG=1`, and sets
  `process.exitCode = 1`.

`main()` runs only when the module is the process entry. The check resolves `process.argv[1]` with
`realpathSync` before comparing it with `import.meta.filename`, because bin shims and installers run
the CLI through a symlink: unresolved, the two paths differ and the CLI would do nothing and exit 0.

## Exit codes

| Situation                                   | Exit code |
| ------------------------------------------- | --------- |
| Help or version                             | 0         |
| Success                                     | 0         |
| Unknown command, bad option, failed command | 1         |
| Unhandled error escaping a command handler  | 1         |

Nothing in this repository may turn a failure into a success. The previous release of this CLI
installed a global `uncaughtException` handler that did exactly that, so process exit and global
process handlers are limited to `src/cli.ts` and enforced by a test.

## Unknown commands

Commander only reports an unknown command when the command has subcommands, and only offers a
"Did you mean" suggestion once there is something to suggest. `main()` therefore registers a
`command:*` fallback, but only while the program has no subcommands, and only at parse time, because
command modules attach after `createProgram()` returns.

Today that fallback reports `error: unknown command 'inti'` itself, exit 1. The moment the first
product command exists, the fallback is not registered and commander produces both the error and the
suggestion on its own. No suggestion text is written today, because the CLI has no commands to
suggest from.

## Build

tsdown produces a single file, `dist/cli.mjs`:

| Setting             | Value                           | Why                                                                                |
| ------------------- | ------------------------------- | ---------------------------------------------------------------------------------- |
| Format              | ESM                             | `type: module`, and Node runs ESM natively                                         |
| Platform / target   | node, Node 22                   | The consumer floor, not the development runtime                                    |
| `deps.alwaysBundle` | Every package in `dependencies` | Native install ships no `node_modules`                                             |
| `define`            | `__JSS_VERSION__`               | The version comes from `package.json` at build time, never a second hardcoded copy |

`tsdown.config.ts` reads `package.json` and derives both the version and the list of dependencies to
inline, so adding a runtime dependency cannot silently leave it external.

## Test strategy

`pnpm test` is self-contained: a vitest `globalSetup` runs the tsdown build once, then the suites run.

| Suite                        | Question it answers                                                           |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `tests/cli.test.ts`          | Does the program produce the right output and the right exit code?            |
| `tests/bundle.test.ts`       | Does the shipped file work on a machine with no `node_modules`?               |
| `tests/architecture.test.ts` | Are the boundary rules still true, and do the rules still detect a violation? |

The bundle suite copies `dist/cli.mjs` into an OS temp directory and runs it there. A temp directory
outside the repository is the point: inside the repo, Node would resolve `node_modules` by walking
up and the test would prove nothing. It also runs the bundle through a symlink, which is how an
installed CLI is reached.

CI adds one check the suites cannot: the `consumer-floor` job runs the bundle built by the gating job
on the exact version in `engines.node`, directly and through a symlink. The matrix only proves the
latest patch of each line, and the toolchain cannot install on the floor itself.

Architecture rules are data, not prose. `tests/support/architecture-rules.ts` holds the rule table,
each rule carries a fixture path, and the suite asserts both directions: `src/` is clean, and each
fixture trips exactly its own rule. Adding a boundary means adding a row and a broken file.

## Version constant

`__JSS_VERSION__` is injected by both `tsdown.config.ts` and `vitest.config.ts`, so the tests
assert against the same value the build ships instead of a copy that can drift.

## Where each fact is declared

One fact, one home. Nothing is written twice in two files that can drift.

| Fact                         | Declared in                                      | Read by                                    |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------ |
| CLI version                  | `package.json`                                   | `tsdown.config.ts`, `vitest.config.ts`     |
| Dependencies to inline       | `package.json` `dependencies`                    | `tsdown.config.ts` `deps.alwaysBundle`     |
| Runtime dependencies bundled | Same list                                        | `tests/bundle.test.ts`, as the real guard  |
| Consumer Node floor          | `package.json` `engines.node`, `>=22.12.0`       | Consumers, pnpm, the `consumer-floor` job  |
| Development Node floor       | `package.json` `devEngines.runtime`, `>=22.13.0` | pnpm locally, `pnpm/setup` in CI           |
| CI Node for the gating job   | `.github/workflows/ci.yml` `runtime: node@24`    | `pnpm/setup`                               |
| CI Node for the matrix       | `.github/workflows/ci.yml` `matrix.node`         | `pnpm/setup`                               |
| Package manager              | `package.json` `packageManager`                  | `pnpm/setup` in CI, pnpm locally           |
| Shared formatting            | `.editorconfig`                                  | Prettier, EditorConfig-aware editors       |
| Other formatting             | `.prettierrc.json`                               | Prettier, `pnpm lint`, `pnpm format:check` |
| pnpm behaviour               | `pnpm-workspace.yaml`                            | pnpm                                       |

The two Node floors are different numbers because different packages set them, so they are stated
separately rather than rounded to one. The Node a given CI job runs is a third fact and lives in the
workflow: a developer floor and a test target are not the same thing, and leaving the gating job to
resolve a range would let it drift to whatever the newest Node happens to be.

`devEngines.runtime` is `onFail: error`, so the declared floor is enforced at install rather than
warned about. See [decisions/0015](./decisions/0015-no-npmrc-no-nvmrc.md).
