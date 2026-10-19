# Project overview and requirements document

## What this is

A rewrite of `@jjuidev/jss-devtools`, a command-line tool for JavaScript-stack repositories. It is a
rewrite, not a merge and not a refactor: neither the existing CLI nor the old harness prototype is
carried over as code. They are sources of ideas and lessons.

## Goal

The CLI does two things.

1. **Toolchain.** Initialise a JavaScript-stack repository with a lint, format, test and build
   toolchain. Node first; React, Next, Nest and React Native presets are planned. The command tree
   nests like Docker's: `jss-devtools --help` opens into `jss-devtools init --help`.
2. **Harness.** Make an agent-driven repository stay excellent over time. The repository, not chat
   context, is the authority an agent works from.

The CLI should be clear, easy to maintain and easy to scale, with flows that handle the real cases
and drop the over-engineered ones.

## Current stage

The foundation is in place: a verified TypeScript CLI repository, the install site that serves it, the
terminal UI layer every command renders through, and the source layout the commands live in.
The CLI entry point has `-h, --help` and `-v, --version`, and `jss-devtools doctor` is the first
command. The next steps are in [project-roadmap.md](./project-roadmap.md).

## Non-goals for now

- The toolchain and harness modules, and the framework presets.
- Publication to npm. Distribution is native installation, and CI/CD never touches npm.
- Committing to a first-release version number.

## Distribution

Installation is native (curl, sh, wget). Deploy infrastructure is a VPS running Dokploy. There is no
npm publish step, so the built artifact must work on its own, with no `node_modules` beside it.

## Principles this project holds to

- The consumer's version floor trails the newest supported release instead of chasing it: take the
  newest release supported, three supported lines back.
- The tool's own source must be clean before features are built on it.
- Evidence levels stay separate. A local check, a git hook, and CI each prove only themselves.
- State what was actually observed. Unverified claims are recorded as unknown, not assumed.
