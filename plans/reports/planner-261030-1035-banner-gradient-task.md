# Task: banner gradient from the design system, and the Node.js label

For the cooker, 2026-10-30. Decided by the user (decision log
[`plans/261022-0141-init-flow-discussion/decision-log.md`](../261022-0141-init-flow-discussion/decision-log.md),
sections "Banner: the Node.js label" and "Banner colours").

## Target

The approved preview, D1, is the script
`/private/tmp/claude-501/-Users-tandm-Desktop-yyyy/97bd11d1-32de-4919-ad10-9f1ccf87d1bf/scratchpad/banner/ds-colours.mjs`
on the planner's Mac (not synced). Its colouring, to reproduce:

- Same art (`BANNER_ART`, figlet ANSI Shadow `JSS`), same layout and info column as today.
- Each non-space character takes a colour from a left-to-right gradient over the art's full width
  (column 0 to the widest row's last column), through three stops: `#e1a9d5`, `#cd89bc`,
  `#ab6496` (design system primary 300, 400, 500), linear interpolation in RGB between neighbours.
- The shadow characters `╚ ╔ ╗ ╝ ║ ═` get the same colour, dimmed.
- Info column: `node v24.22.0 · macOS arm64` becomes `Node.js v24.22.0 · macOS arm64`. The rest of
  the info column stays as it is.

## Rules

- No new dependency. Keep the art a constant.
- Colour depth from the stream (`process.stdout.getColorDepth()`, or the stream the banner writes
  to): 24-bit uses `38;2;r;g;b`; 8-bit maps each colour to the nearest xterm 256-colour index
  (`38;5;n`); below that, the whole art in one 16-colour `magenta`. Check what `getColorDepth`
  returns under `NO_COLOR`, `FORCE_COLOR=0/1/2/3` and `TERM=dumb`, and make sure `NO_COLOR` gives
  no escape codes at all.
- The banner still shows on an interactive terminal only, as today; piped and `CI=1` print no banner.
- Name the three stops after their tokens (for example `DS_PRIMARY_300`) in
  `src/core/constants/banner.constant.ts`; the source is in the decision log, not in a comment.
- `banner.ui.ts` stays the only place that renders it; the 80-column fit test stays green.

## Tests

- Depth 24: the first and last non-space characters of a row carry the two end stops' truecolor
  codes; a shadow character carries the dim code.
- Depth 8: only `38;5;` codes. Depth 4: one 16-colour code, no `38;2`/`38;5`.
- `NO_COLOR`: no `\x1b`. Piped: no banner.
- The info line reads `Node.js v… · <platform> <arch>`.
- Update any test or doc that asserts the old per-row colours or `node v…`.

## Comments

Default zero comments; one line only for a trap a reader would otherwise break. No JSDoc that says
what something is or does. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output. No report file, no commit;
reply with the Status block, a short summary and the files changed.
