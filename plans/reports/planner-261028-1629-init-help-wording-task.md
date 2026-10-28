# Task: shorter wording for four init help lines

For the cooker, 2026-10-28. Approved by the user: "Approve H5, H8, H10, H11", rows of
[the message review](./planner-261028-1136-init-message-rewrites.md), adjusted to the later decisions
(long flag first, notes before `default:` inside the parentheses).

## Change

| Row | Where | New description, exactly |
|---|---|---|
| H5 | `init [dir]` argument | `Folder for a new project (missing or empty); omit it to set up the current folder` |
| H8 | `--force, -f` | `Replace existing ESLint, Prettier, commitlint and editor configs (init stops and lists them; default: off)` |
| H10 | `--yes, -y` | `Skip the questions and use the defaults (asks in a terminal; default: off)` |
| H11 | `--dry-run` | `Show what would change; write and install nothing (default: off)` |

`--yes` and `--dry-run` live in `src/core/constants/common-option.constant.ts`; the others in
`src/commands/init/init.command.ts`. Nothing else changes: every other help line, the examples, every
runtime message and the doctor description stay as they are (the doctor line waits on open question
D1).

## Tests and docs

- Update the help snapshots and assertions (`tests/init.command.test.ts`, `tests/bundle.test.ts`,
  `tests/cli.test.ts` and any other that asserts these lines).
- Update any doc that quotes these four descriptions (grep `docs`, `README.md`); the decision log and
  the message review are the planner's, do not edit them.

## Comments

Default zero comments. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. No commit; reply with the
Status block, a short summary and the files changed.
