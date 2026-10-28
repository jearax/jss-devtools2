# Task: stop early when the plan is empty

For the cooker, 2026-10-29. Decided by the user (decision log, "Nothing to change").

## Today

In a project init already set up, `init -f -y` builds a plan with no entry, prints the heading as
the bare project name (`◇  done` and two empty `│` lines), then runs the install and the
package.json sort. `init -f --dry-run` prints the bare heading and `To apply: $ jss-devtools init -f`.

## Target

When the plan has no entry, right after the plan is built and before the heading:

```text
┌   jss-devtools init
│
└  Nothing to change in done
```

- stdout, exit 0, the same in dry run (no `To apply:` block) and with or without `-y`.
- No heading, no list, no confirm, no install, no sort, no Next steps.
- Remove the bare-name branch of `renderPlanHeading` if nothing else can reach it; if something
  can, say what.

## Tests

- `-f -y` on a set-up project: the exact output, exit 0, and no install or sort runs (stub them as
  the existing tests do).
- The same with `--dry-run`.

## Comments

Default zero comments. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. No commit; reply with the
Status block, a short summary and the files changed.
