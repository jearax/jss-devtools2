# Task: lint-staged without repeated work

For the cooker, 2026-10-29, after the capital-errors task is committed. Decided by the user (decision
log, "lint-staged without repeated work"): each staged file goes through each tool at most once, and
a commit lists as few commands as the file types need.

## Today (same in `package.json` here and in `LINT_STAGED`, `package-json.template.ts`)

```json
"{{src,…}/**/*,*}.{cjs,mjs,js,jsx,cts,mts,ts,tsx}": ["eslint --fix", "prettier --write"],
"!(package).json": ["prettier --write"],
"**/*.{md,yml,yaml}": ["prettier --write"],
"package.json": ["prettier-package-json --write", "prettier --write"]
```

## Change

1. Code files: drop `prettier --write`. ESLint's `prettier/prettier` rule (error) already formats them
   on `eslint --fix`.
2. `package.json`: check whether `prettier --write` after `prettier-package-json --write` still
   changes anything. Write an unsorted, badly indented `package.json`, run only
   `prettier-package-json --write` on it, then `prettier --check package.json`. If the check passes,
   drop the second command; if not, keep it and say what differed.
3. The other JSON files and the Markdown and YAML files: merge the two globs into one only if
   lint-staged's own matching (run it on staged files, do not reason from the glob alone) proves the
   merged glob takes every `.json` except `package.json` at any depth, plus every `.md`, `.yml` and
   `.yaml` at any depth, and never `package.json`. lint-staged runs globs concurrently, so a file
   matched by two globs would be written by two tools at once; that must not happen.

Apply the result to both places. Keep the code glob as it is.

## Tests and docs

- The template test and snapshot for `LINT_STAGED`.
- Any doc that shows the lint-staged config (grep `docs`, `README.md`).

## Comments

Default zero comments. List every comment your diff adds.

## Verification

`pnpm lint && pnpm typecheck && pnpm test && pnpm build`, real output, plus the output of the checks
in steps 2 and 3. The planner runs a real `git commit` through husky on the Mac. No commit; reply
with the Status block, a short summary and the files changed.
