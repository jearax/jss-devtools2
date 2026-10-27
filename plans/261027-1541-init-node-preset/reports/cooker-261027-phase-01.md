# Cooker report — Phase 1: Roles, adapters and dependencies

Date: 2026-10-27. Working copy synced via Mutagen (no `.git`, no `node_modules`, no `dist` from the
Mac); nothing committed, nothing pushed. Node on this machine is 24.21.0 (above the 24.11.0 floor);
pnpm 11.24.0 was already present, `pnpm install` ran clean.

## Files changed

Created:

- `src/core/adapters/package-manager.adapter.ts` — `detectPackageManager` (`detect({ cwd, stopDir: cwd })`),
  `packageManagerVersion`, `installPackages` (stdio passed through), `runLocalBin`; commands come from the
  library's `resolveCommand` (`install`, `execute-local`), no command string written by hand
- `tests/package-manager-adapter.test.ts` — detect cases from the verification section, plus
  `packageManagerVersion` real-npm and missing-manager cases
- `tests/fixtures/architecture/src/commands/init/constants/legacy-helper.ts` and
  `.../templates/legacy-helper.ts` — negative fixtures for the two new roles

Modified:

- `tests/support/architecture-rules.ts` — added `commands/<name>/constants/` (`.constant.ts`) and
  `commands/<name>/templates/` (`.template.ts`) to `ROLE_SUFFIXES` before the generic commands entry;
  changed the rule shape from `fixture: string` to `fixtures: readonly string[]` so one rule can carry
  several negative fixtures
- `tests/architecture.test.ts` — follows the `fixtures` change: iterates every fixture, uniqueness over
  the flattened list
- `src/core/adapters/git.adapter.ts` — added `gitInit` (`git init -q -b main`), `gitHooksPath`
  (`git config --get core.hooksPath`, unset is not an error), `gitTopLevel`
- `src/core/utils/run-command.util.ts` — added `inheritStdio` option
- `tests/git-adapter.test.ts`, `tests/run-command.util.test.ts` — tests for the above
- `package.json`, `pnpm-lock.yaml` — `package-manager-detector` pinned `1.9.0` exact in `dependencies`
- `docs/decisions/0024-core-and-command-layout.md` — amendment note (dated 2026-10-27) adding the two
  command-owned roles; the record keeps its original date
- `docs/code-standards.md` — the two rows added to the role-suffix table

## Small decisions made here, and why

- **`fixture` → `fixtures` in the rule type (touches `tests/architecture.test.ts`).** The plan requires a
  negative fixture for each of the two new roles, but they both extend the single `file-role-suffix` rule,
  whose shape held one fixture. Pluralising was the smallest change that keeps every fixture actually
  asserted by the suite. Not in the phase's file list, so flagged here.
- **Inherited runs go through `spawn`, not `execFile`.** `execFile` does not accept a `stdio` option in
  Node's types and does not document it; `execFile` stays the captured path, `spawn` carries
  `stdio: 'inherit'`. Guarded by a one-line comment (a tool trap).
- **`installPackages` / `runLocalBin` return the exit code (`number | null`).** Phase 4 owns the
  install flow; phase 1 only needs the building block. `resolveCommand` returning `null` for a known
  agent cannot happen for the supported managers, so it throws with a named message instead of inventing
  a silent code.
- **`gitInit` returns `void`.** The decision log has preflight check git before anything is written, so
  the adapter does not duplicate a status union.
- **`gitTopLevel` is compared with `realpath` in its test**, because `/tmp` can be a symlink and git
  prints the physical path.
- **No integration test for `installPackages`/`runLocalBin`**: they would run a real install (network)
  or `npx`; the verification section asks for the detect cases and the stdio exit-code test, both of
  which exist.

## Gate output (real)

`pnpm lint && pnpm typecheck && pnpm test && pnpm build` — all green:

- `pnpm lint`: clean (after two autofix rounds; final run exits 0, no output)
- `pnpm typecheck` (`tsc --noEmit`): clean
- `pnpm test`: `Test Files  13 passed (13)` / `Tests  126 passed (126)`
- `pnpm build`: `dist/cli.mjs  119.67 kB │ gzip: 29.86 kB`, `✔ Build complete`

Bundle size: **119135 bytes before → 119675 bytes after** (+540 bytes, package-manager-detector bundled;
the phase-2 template content is not in yet).

## What the plan did not say

- The verify steps of the two architecture fixtures run through the generic `detects %s from %s` test;
  no dedicated per-role test names exist.
- The `gitHooksPath` "unset" case returns `null` for any non-zero exit, not only exit 1; git
  distinguishes nothing else in practice here.

## Review fixes (2026-10-27, planner review round 2)

Accepted by planner: `fixture` → `fixtures[]` and the `tests/architecture.test.ts` change.

Applied:

1. `gitInit` returns `boolean` (`result.code === 0`) instead of `void`; new test
   `returns false when the folder to initialize does not exist`.
2. `runLocalBin` returns `RunResult` (code, stdout, stderr); `installPackages` still returns the code
   only (stdio inherited, nothing to capture).
3. Offline tests added: `installPackages('npm', dir)` with a dependency-free `package.json` gives
   code 0, with an unparseable one a non-zero code; `runLocalBin('npm', 'hello', ['a'], dir)` against
   a `node_modules/.bin/hello` sh script (mode 755) gives code 0 and stdout containing `a`.
4. Removed the `git 2.28+` comment at `gitInit` and the two-line comment in `resolveOrThrow`; kept the
   `runInherited` comment.

Blocked, reported instead of worked around: the `runLocalBin` case "bin does not exist → non-zero"
cannot be tested offline. Probed on this machine (npm 11, Node 24): `npx` — npm's `execute-local`
command, still resolved through `resolveCommand`, not hand-written — finds the local `.bin` first and
runs it with no network (exit 0), but when the bin is missing it falls back to the registry and fails
with a 404 after a network call (exit 1). The phase instruction says to stop and report when the
execute-local command needs the network, so the missing-bin assertion is not in the suite. If the
planner accepts the network probe, the test is one `it` block away; otherwise it needs an
offline-capable contract for execute-local.

## Review fixes round 3 (2026-10-27)

Planner decision on the blocked case: no network test for a missing bin.

Known limits:

- With npm (`npx`) and bun (`bun x`), a bin that is not in the project is downloaded from the
  registry. `init` only calls `runLocalBin` after a successful install of the pinned set, which
  already contains `prettier-package-json` and `prettier`, so the main flow never hits this.

Fixed: `runLocalBin` used to call `resolveCommand(pm, 'execute-local', [])` and join `bin` and the
args itself, which loses the `--` separator the library inserts (for yarn:
`yarn exec prettier -- --write`). It now resolves through a new pure `resolveLocalBin(pm, bin, args)`
exported from the adapter, which passes `[bin, ...args]` to `resolveCommand` and uses the returned
`command`/`args` as-is; `runLocalBin` just runs them. Pure tests (no command executed): yarn keeps
`exec prettier -- --write`; npm hands `prettier --write` to `npx`.

Gate after round 3, real output:

- `pnpm lint`: clean
- `pnpm typecheck`: clean
- `pnpm test`: `Test Files  13 passed (13)` / `Tests  132 passed (132)`
- `pnpm build`: `dist/cli.mjs  119.67 kB │ gzip: 29.86 kB`, `✔ Build complete`; bundle 119675 bytes,
  unchanged

Gate after the review fixes, real output:

- `pnpm lint`: clean
- `pnpm typecheck`: clean
- `pnpm test`: `Test Files  13 passed (13)` / `Tests  130 passed (130)`
- `pnpm build`: `dist/cli.mjs  119.67 kB │ gzip: 29.86 kB`, `✔ Build complete`; bundle 119675 bytes,
  unchanged (the adapter changes are types and control flow only)
