# Task: sort the init plan list like the VS Code explorer

For the cooker, 2026-10-28, after the long-flag task. Decided by the user (decision log, "Order of
the plan list"): folders first, then files, alphabetical, as in the VS Code explorer.

## Rule

Compare two paths segment by segment. At the first differing level, a segment that is a folder (more
segments follow) comes before a file. Otherwise compare the names with
`new Intl.Collator('en', { numeric: true, sensitivity: 'base' })`. Every entry sorts by its path,
whatever its mark. Sort only in `renderPlan` (`src/commands/init/plan.service.ts`); the plan entries
and the write order stay as they are. The heading counts do not change.

## Target, create mode with pnpm

```text
◇  my-app: 14 to create
│  + .husky/commit-msg
│  + .husky/pre-commit
│  + .vscode/extensions.json
│  + .vscode/settings.json
│  + src/main.ts
│  + .editorconfig
│  + .gitignore
│  + .prettierignore
│  + .prettierrc.json
│  + commitlint.config.mjs
│  + eslint.config.mjs
│  + package.json
│  + pnpm-workspace.yaml
│  + tsconfig.json
```

The planner checked this comparator against the repository root as the VS Code explorer shows it:
`.dockerignore .editorconfig .gitignore .prettierignore .prettierrc.json CLAUDE.md commitlint.config.mjs
eslint.config.mjs LICENSE package.json pnpm-lock.yaml pnpm-workspace.yaml README.md tsconfig.json
tsdown.config.ts vitest.config.ts`.

## Tests

- The create list above (pnpm, and npm without `pnpm-workspace.yaml`, and `--no-vscode`).
- Existing mode with `-f`: `~`, `+` and `-` entries interleaved by path.
- The comparator alone: folder before file at the same level, case-insensitive (`CLAUDE.md` after
  `.prettierrc.json` and before `commitlint.config.mjs`), numeric (`a2` before `a10`).
- Update every test and doc that shows the old order.

## Comments

Default zero comments; one line only for a trap a reader would otherwise break. No JSDoc that says
what something is or does. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output, and the piped output of
`node dist/cli.mjs init my-app --pm pnpm --dry-run` in a temp folder. No commit; reply with the
Status block.
