---
phase: 2
title: "The doctor command"
status: done
priority: P1
effort: "1.5h"
dependencies: [1]
---

# Phase 2: The doctor command

## Goal
`jss-devtools doctor` reports three checks with IDs and fix hints, exits 1 when any fails, and is the
first command registered from `src/commands/`.

## Output
The banner on a TTY, then clack: `intro`, a spinner on a TTY, one `log.success` or `log.error` per check with
its fix hint, then `outro` when every check passes. A failure ends with a `CliError` that `cli.ts`
renders on stderr.
```
     ██╗███████╗███████╗
     ██║██╔════╝██╔════╝   jss-devtools v0.0.1
     ██║███████╗███████╗   JavaScript stack dev tools CLI
██   ██║╚════██║╚════██║
╚█████╔╝███████║███████║   node v22.22.1 · macOS arm64
 ╚════╝ ╚══════╝╚══════╝

┌  jss-devtools doctor
│
◆  node.version   v22.22.1 >= 22.22.1
│
◆  git.installed  git version 2.55.0
│
■  git.repository not a git repository
│  fix: run `git init`, or cd into a repository
│
■  1 check failed                                  (stderr, exit 1)
```

## Steps
- [x] `types/doctor-check.type.ts`: `DoctorCheck` (`id`, `run(context)`) and `DoctorResult`
      (`id`, `ok`, `detail`, `hint?`). The context carries `cwd`, the running Node version and the
      git adapter, so tests pass fakes. **Done (2026-10-21).** The context holds a `GitProbe`, the
      two calls the checks need, so a test can pass a fake and `core/` does not have to know what a
      doctor check is.
- [x] `checks/node-version.check.ts`: running Node against `PACKAGE.nodeFloor`. **Done
      (2026-10-21).**
- [x] `checks/git-installed.check.ts`: the adapter's version, failing with an install hint on ENOENT.
      **Done (2026-10-21).**
- [x] `checks/git-repository.check.ts`: skipped as failed with "needs git" when git is missing, so
      one missing tool reports once. **Done (2026-10-21).**
- [x] `doctor.service.ts`: runs every check, never throws for a failed check, returns results in a
      fixed order. **Done (2026-10-21).**
- [x] `doctor.command.ts`: exports `registerDoctorCommand(program)`; renders the results through
      `showBanner()`, clack and the spinner from `terminal.ui.ts`, ends with `outro` on success, and throws
      `CliError('<n> check(s) failed')` when any failed. **Done (2026-10-21).** The spinner covers
      the run of the checks, so the output has one progress line in front of the results.
- [x] `src/cli.ts`: register the doctor command; delete `addUnknownCommandFallback`, since commander
      reports unknown commands itself once a subcommand exists. **Done (2026-10-21).**
- [x] Tests: service with fake contexts (all pass, Node below floor, git missing, not a repo);
      bundle test runs `doctor` in a temp git repo (exit 0) and a temp plain directory (exit 1 with
      the hint), and asserts the piped output carries neither the banner nor a `\x1b[?25l` cursor sequence; existing
      unknown-command tests stay green unchanged. **Done (2026-10-21).** The unknown-command test
      stayed green without a change: commander names the command and exits 1 on its own.

## Outcome

Done on 2026-10-21. `jss-devtools doctor` opens with the banner on a terminal, reports the three
checks in a fixed order, and ends with a `CliError` when any of them failed, so the failure reaches
stderr and the exit code is 1.

One thing the plan did not say: a failed check is a result, not an exception, so the service runs
every check and the command renders them all. The count of failures is what the `CliError` carries.

## Verification
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green on Node 22.22.1.
- Manual: `node dist/cli.mjs doctor` here and in `/tmp`; `node dist/cli.mjs --help` lists `doctor`.

## Risks
- clack's symbols in a terminal without Unicode: clack falls back to ASCII itself (`unicode`
  export); the check IDs carry the meaning either way.
