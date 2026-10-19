# Reviewed the toolchain and cut the comment load

## What happened

Ten commits after the alignment journal. None of them started a feature; every one removed
something that was wrong or redundant. The subject is the toolchain, the shape is deletion.

## Decisions

- ESLint 9 was tried and reverted (user, 2026-10-19). `eslint.org/version-support` lists 9.x as
  end-of-life since 2026-08-06, and the registry marks 9.39.5 deprecated. pnpm printed the
  opposite, "(10.13.0 is deprecated)", which is what nearly caused the mistake; the registry is
  authoritative. The reference repository's `^9.39.5` is no longer a floor worth copying.
- The development Node floor is `>=22.13.0`, separate from the consumer floor `>=22.12.0`
  (user, 2026-10-19: "approve >=22"). CI proved the two are different numbers: ESLint 10 declares
  `^20.19.0 || ^22.13.0 || >=24`, commander 15 only needs `>=22.12.0`.
- `engineStrict` was removed. pnpm checks dependency engines against a version resolved from the
  declared range rather than the running Node, so `>=22.12.0` was checked as 22.12.0 and ESLint
  refused it. The project's own `engines.node` is enforced regardless of that setting.
- The `no-restricted-syntax` ban on `enum` was removed (user, 2026-10-19). It encoded a style
  preference as a hard error with nothing behind it.
- `allowJs` and `checkJs` were removed, taking `types/eslint-plugin-autofix.d.ts` with them
  (user, 2026-10-19). Type-checking the `.mjs` config files needed an ambient stub for a plugin
  that ships no types, and `tsc` does not report the `@deprecated` diagnostic that prompted the
  question anyway. Cost: `eslint.config.mjs` and `commitlint.config.mjs` leave the program. The
  `.ts` config files stay in it.

## Findings worth keeping

- `defineConfig` intersects a block's `files` with every extended entry's `files`. A brace glob
  such as `**/*.{mts,ts,cts,tsx}` intersected with `typescript-eslint/eslint-recommended`'s own
  `**/*.ts` produces a matcher ESLint rejects. Plain `**/*.ts` works. The first diagnosis blamed
  ESLint and was wrong; it was fixed by running the documented pattern instead of reasoning about
  the shapes.
- `tseslint.globs.js` and `tseslint.globs.ts` are strings, not arrays. `[...tseslint.globs.ts]`
  spreads a string into its characters and silently produced a twenty-element glob.
- The custom rules block was scoped to JavaScript, so `src/*.ts` had never been linted by autofix,
  import ordering, arrow-body or padding rules. Enabling it found a real import-order bug in
  `tests/bundle.test.ts` and three unbraced single-line `if` bodies.
- `.gitignore` excluded `.vscode/`, so the two settings files that three documents link to were
  never committed. The docs had been describing files that did not exist.
- The reference `.editorconfig` sets `indent_size = 2` under `[*.{yml,yaml}]` and `[*.md]`, which is
  the value `[*]` already sets. Both blocks changed nothing and were dropped here.
- Brace expansion does not exist in `.gitignore`. `!.vscode/{settings,extensions}.json` matches
  nothing and reports nothing, which would have silently returned the `.vscode` bug.
- In glob syntax `?` is exactly one character, not zero-or-one. `tests?` matches `testsX`.
  Optional plural is `test{,s}`, and `__tests__` needs `__test{s,}__` because the `s` goes before
  the trailing underscores.
- A folder inside a brace group that does not exist is harmless. ESLint fails only when a pattern
  matches nothing at all, which is why the folder list can name the whole Node ecosystem up front.

## Mistakes

- `rm -rf test tests` during a glob experiment deleted the real `tests/` directory, eight files.
  Caught because the linted file count fell from 14 to 7. Restored with `git checkout -- tests/`.
  Use a prefixed scratch directory name next time.

## Verification

Every commit was pushed and confirmed green on CI: the gating job plus a Node 22, 24 and 26
matrix, each running a frozen install, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build`
from a clean checkout. Formatting is covered there too, because `prettier/prettier` runs as an
ESLint rule, so `pnpm lint` fails on it; `pnpm format:check` exists for the pre-commit path and is
not a CI step.

Lint covers exactly the fourteen tracked source files, and a stray `scratch/` directory does not join
them.

## Next steps

Core module layout is the next plan. X1 (exit codes) and X2 (which H0 decisions carry over) shape
it and are still open.
