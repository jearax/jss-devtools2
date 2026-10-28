# Task: the confirm counts deletions apart

For the cooker, 2026-10-29. Decided by the user (decision log, "Confirm counts deletions apart").
Today `init -f` in a project with two legacy configs asks `Write 13 files to p2 and install?` under
the heading `p2: 10 to create, 1 to update, 2 to delete`: 13 counts the two deletions as written.

## New text, in the confirm of `src/commands/init/init.command.ts`

`<w>` = entries to create or update, `<d>` = entries to delete.

| Case | Message |
|---|---|
| no deletion | `Write <w> files to <project> and install?` (as today) |
| with deletions | `Write <w> files; delete <d> in <project> and install?` |
| `<w>` is 1 | `1 file` in either form |

Examples: `Write 11 files; delete 2 in p2 and install?`, `Write 1 file; delete 1 in p2 and install?`,
`Write 13 files to p1 and install?`.

If a plan with `<w>` = 0 and `<d>` > 0 can reach the confirm, say how and what it would print; do not
invent wording for it.

Count from the plan entries' `action`, the same source as the heading counts in `plan.service.ts`;
do not keep a second count.

## Tests

The three cases above, plus singular, through the confirm's message (mock the prompt as the existing
tests do).

## Comments

Default zero comments. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. No commit; reply with the
Status block, a short summary and the files changed.
