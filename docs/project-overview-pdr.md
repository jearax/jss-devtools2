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

Phase 0 of the rewrite: a clean, verified TypeScript CLI repository that feature work can build on.
The CLI entry point exists with `--help` and `--version`. No product command has been built yet. The
next steps are in [project-roadmap.md](./project-roadmap.md).

## Non-goals for now

- Product commands, framework presets, and the harness module.
- Publication to npm. Distribution is native installation, and CI/CD never touches npm.
- A release workflow, `install.sh`, or the installation site.
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
