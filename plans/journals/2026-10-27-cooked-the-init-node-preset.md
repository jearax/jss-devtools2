---
title: Cooked the init node preset
date: 2026-10-27
summary: "Filled jss-devtools init with the decided node-preset flow across five phases: pinned versions, preflight, plan, write and install, plus the pnpm-workspace fixes and the end-to-end suite"
---

# Cooked the init node preset

## What happened

The [init node preset plan](../261027-1541-init-node-preset/plan.md) was cooked, phases 1 to 5, one
report per phase in [its reports folder](../261027-1541-init-node-preset/reports/). `init <dir>`
creates a TypeScript node project that installs, lints, typechecks, builds and runs with git hooks
active; `init` sets up an existing repository by merging the shared files and stopping on the
owned-file list unless `-f`. The decision record is
[0030](../../docs/decisions/0030-init-node-preset.md).

## Findings

- **pnpm 11 re-checks build scripts on every `pnpm exec`.** The phase 4 review ran the bundle and
  found `pnpm install` failing with `ERR_PNPM_IGNORED_BUILDS` for `esbuild` (tsx's dependency), and
  every later `pnpm run` failing the same way, because the workspace file had no `allowBuilds`
  entry. `esbuild: true` joined the template; the user decided existing mode manages only the two
  `allowBuilds` entries and never `strictPeerDependencies` or `engineStrict` — an earlier reading
  that added them was the planner's misreading of "OK, nhưng tôi thấy còn có quản lý 2 fields này",
  corrected to "Không thêm".
- **`pnpm-workspace.yaml` no longer means monorepo.** pnpm 11 writes the file for single packages,
  so the check looks for a top-level `packages` field. The merge is line-based on purpose: it keeps
  the user's bytes and their values (`false` included), and a flow-style `allowBuilds: { … }` stops
  in preflight with the entries to add by hand instead of pulling in a YAML dependency.
- **The end-to-end suite is the version proof.** It creates a project with each manager on `PATH`,
  then lints, typechecks, builds and runs `node dist/main.js` — the only check that catches a
  tsc-alias import it cannot rewrite. It is gated behind `INIT_E2E=1` and run alone, because it
  installs from the registry; the default `pnpm test` reports it skipped. On this machine (npm and
  pnpm only): npm 22.6s, pnpm 7.6s, suite 42.6s. yarn 1 and bun are skipped where absent.
- **The sorted-manifest check must replay both bins.** `prettier-package-json` alone rewrites the
  indentation to its own defaults and `prettier` alone rewrites the keys' order, so asserting the
  file is unchanged after either single bin always fails; only the decided two-bin sequence
  (`prettier-package-json`, then `prettier`) is idempotent, and that is what the test replays.
- **"Exactly the decided list" has two honest exclusions.** husky fills `.husky/_` with its shims on
  install, and the package manager writes its lockfile; neither is init's writing, so the e2e file
  check names both as expected extras rather than loosening to a subset assertion.
- **pnpm's workspace placeholders are prompts, not values.** After a failed install pnpm 11 writes
  `esbuild: set this to true or false` into `pnpm-workspace.yaml`. Treating that as a user value
  kept it forever and every later install failed again; the merge now rewrites a value that is
  neither `true` nor `false`, and takes the child indent from the file instead of assuming two
  spaces, which had produced mixed-indentation YAML for a 4-space file.
- **macOS path resolution bit twice before.** Phases 3 and 4 both hit `/var` → `/private/var`; the
  e2e sidesteps it by comparing bytes and exit codes only, never the recorded cwd strings.

## Measurements

Bundle `dist/cli.mjs`: 190.16 kB at the end of phase 4; 192623 bytes with the phase 5 source
fixes, 193160 bytes final after the phase 5 review (the indent-aware, placeholder-aware merge).
The ~3 kB over phase 4 is the phase 5 source itself. Gate on Node 24.21.0: lint clean, typecheck
clean, `Test Files 19 passed | 1 skipped (20)`, `Tests 209 passed | 5 skipped (214)`, build
`192.63 kB │ gzip: 49.13 kB`. The pinned table stood at phase 2's values; no pin moved.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
