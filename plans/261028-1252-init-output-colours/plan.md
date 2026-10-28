---
title: "init: colours and steps in the output"
description: "Colour the init plan list like a light git diff, head it with counts, and show the install and the package.json sort as framed steps, without breaking piped output."
status: done
priority: P2
effort: 4h
branch: main
tags: [init, cli, ui]
blockedBy: []
blocks: []
created: 2026-10-28
---

# init: colours and steps in the output

## Outcome

In a terminal, `jss-devtools init my-app --pm npm -y` shows the files to write with coloured marks
under a heading that counts them, then the install as a short live log that collapses into one line,
then the sort as its own line, then the outro. Piped or in CI, the same lines appear in plain text
with the same icons, plus the package manager's whole output; not one escape code.

## Input

Decided with the user on 2026-10-28, quoted in
[the init flow decision log](../261022-0141-init-flow-discussion/decision-log.md), section "Colours
in the init output". The approved mockup is reproduced in phase 1. The run that found the current
output is [the init test matrix](../reports/planner-261028-0122-init-command-test-matrix.md) (issues
#5 and #6 there are settled by this plan).

## Phases

| # | Phase | Depends on |
|---|---|---|
| 1 | [Coloured plan, install and sort steps](./phase-01-coloured-plan-and-steps.md) | none |

One commit, conventional, on `main`, made by the planner after review.

## Acceptance

- Terminal (verified by the planner in a pty): the marks and counts are coloured as specified; the
  install shows at most 5 dim lines while it runs and only `Installed with <pm> (<s>s)` after it;
  a failed install keeps every line of the log and then prints today's error.
- Piped and with `CI=1`: stdout and stderr contain no `\x1b`; the step lines, icons and the whole
  install output are there.
- `NO_COLOR=1` in a terminal: no colour, layout unchanged.
- Exit codes, file lists, preflight messages, the confirm prompt and the outros other than the
  dry-run one are unchanged; the planner reruns the 63-case matrix to prove it.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green on Node 24.11.0.

## Non-goals

- A content diff of any file.
- Rewording any message under review in
  [the message review](../reports/planner-261028-1136-init-message-rewrites.md).
- Colour in `doctor`, which has its own check list.
