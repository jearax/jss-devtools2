# Task: doctor checks the machine, not the folder

For the cooker, 2026-10-29. Decided by the user (decision log
[`plans/261022-0141-init-flow-discussion/decision-log.md`](../261022-0141-init-flow-discussion/decision-log.md),
section "What doctor checks"; open question D1 answered). `doctor` answers "is this machine ready
for jss-devtools?"; init answers for the folder. The git repository check goes, and the package
managers init supports are added.

## Target output

Terminal, all fine (colours as today: `✔` green, `–` dim, notes dim):

```text
┌   jss-devtools doctor
│  ✔ Node.js  v24.11.0  needs >= 24.11.0
│  ✔ Git      2.55.0
│  ✔ bun      1.3.8
│  ✔ pnpm     11.24.0
│  – yarn     not installed
│  ✔ npm      11.6.2
│
└  Ready: Node.js, git and 3 package managers
```

- The package manager rows follow the fixed order bun, pnpm, yarn, npm (decision log, "Package
  manager order"); the mockup the user approved listed npm first, the order rule wins.
- `1 package manager` for one.
- A missing package manager is a `–` row with `not installed`; it is not a failure.
- yarn 2 or newer is a `–` row too, since init supports only yarn 1 (preflight E6): `yarn  4.5.0`
  with the dim note `init supports yarn 1 only`. Reuse the rule in `preflight.service.ts`, do not
  copy the `>= 2` test; move it to one shared place if both need it.
- No usable package manager at all is a failure row: `✖` on a `Package manager` row,
  `none found`, hint `Install npm, pnpm, yarn 1 or bun`. Pick the shape that fits the list; say what
  you chose.

Failure (stderr, exit 1), Node or git as today:

```text
│  ✖ Git      not installed
│    ↳ Install git, then run the command again
│  …
└  1 of 2 checks failed
```

The count in `<n> of <m> checks failed` counts only rows that can fail (Node.js, Git, and the
`Package manager` row when it is shown); `–` rows are not checks.

## Rules

- Remove `checks/git-repository.check.ts`, its test cases, and `isInsideWorkTree` from the doctor
  context. Keep `isInsideWorkTree` in `git.adapter.ts` if init uses it.
- Package manager versions come from `packageManagerVersion` in
  `src/core/adapters/package-manager.adapter.ts`; run the probes concurrently.
- `renderCheckList` in `src/core/ui/check-list.ui.ts` gains the third state. Replace `ok: boolean`
  with a status (`ok`, `fail`, `info` or similar) on both `CheckListRow` and `DoctorResult`; do not
  add a second flag next to `ok`.
- Help (message review row H3): `Check Node.js, git and the package managers`.
- Piped, `CI=1` or `NO_COLOR`: same text, no escape codes.
- Respect `tests/support/architecture-rules.ts`; only `src/cli.ts` touches process exit.

## Docs

Update every place that says doctor checks the git repository or describes the three checks:
`README.md` (line 52 and the commands block), `docs/system-architecture.md` ("The doctor command"),
`docs/codebase-summary.md`, `docs/project-overview-pdr.md` if it lists the checks. Grep `src`,
`tests`, `docs`, `README.md` for `Git repository`, `git repository`, `Check the environment`,
`All 3 checks`.

## Tests

- Every package manager installed, some missing, yarn 2+, none usable; Node below the floor; git
  missing. Stub the probes; do not depend on what the machine has.
- The outro wording, singular and plural; the failure count ignores `–` rows.
- Piped output has no `\x1b`.

## Comments

Default zero comments; one line only for a trap a reader would otherwise break. No JSDoc that says
what something is or does. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. If a hook blocks running the
built bundle, skip that and say so; the planner runs it on the Mac. No commit; reply with the Status
block, a short summary and the files changed.
