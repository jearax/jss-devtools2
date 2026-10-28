# Task: legacy ESLint config counts as another name of the ESLint config

For the cooker, 2026-10-28. Decided by the user (decision log, "Legacy ESLint config (matrix issue
#4)"). Today a project with `.eslintrc.json` passes init without a word, and `-f` leaves the file;
ESLint 10 ignores it, so it is a dead second config.

## Change

`CONFIG_NAMES.eslint` in `src/commands/init/constants/config-name.constant.ts` gains the legacy
names, so the existing table-driven detection, the exit 1 list, the `-f` deletion and the
`package.json` key removal all cover them with no new code path:

- files: `.eslintrc.js`, `.eslintrc.cjs`, `.eslintrc.yaml`, `.eslintrc.yml`, `.eslintrc.json`,
  `.eslintrc`
- `packageJsonKeys`: `eslintConfig`

Update the date in that file's comment to say where the legacy names come from (`@eslint/eslintrc`
`configFilenames`, read 2026-10-28), one line. If any code path does not go through the table, say
so instead of adding a special case.

## Docs

- `docs/decisions/0030-init-node-preset.md` and any doc that lists the ESLint names or states the
  `.eslintrc` known limit: list the legacy names, drop the limit.
- The decision log is the planner's; do not edit it.

## Tests

- Without `-f`: `.eslintrc.json` alone, and `eslintConfig` in `package.json` alone, each exit 1 with
  the name in the list.
- With `-f`: `- .eslintrc.json` in the plan, the file gone after the run, `eslintConfig` removed from
  `package.json`, the other keys kept.
- Every one of the six file names is detected (one table-driven test).

## Comments

Default zero comments. List every comment your diff adds or changes.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. No commit; reply with the
Status block, a short summary and the files changed.
