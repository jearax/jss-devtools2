# Task: the two init questions

For the cooker, 2026-10-29. Decided by the user (decision log, "The two questions").

## Change, in `src/commands/init/init.command.ts`

| Where | Now | New |
|---|---|---|
| package manager question, `message` | `package manager` | `Which package manager?` |
| package manager question, option order | bun, pnpm, yarn, npm (`PM_CHOICES`) | npm, yarn, pnpm, bun |
| confirm, `message` | `write <n> files to <project> and install?` | `Write <n> files to <project> and install?` |

- Derive the question's order from `PACKAGE_MANAGERS` reversed; do not write a second list. `npm`
  stays the `initialValue`.
- Only the question's options change order. `--pm` help values (`PM_CHOICES` in `.choices`), the
  supported list in errors and lockfile detection keep bun, pnpm, yarn, npm.
- The confirm count stays as it is today.

## Tests and docs

- The question's message and option order; the confirm message.
- Update any doc or test that quotes the old text (grep `docs`, `README.md`, `tests`). The decision
  log and the message review are the planner's; do not edit them.

## Comments

Default zero comments. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. No commit; reply with the
Status block, a short summary and the files changed.
