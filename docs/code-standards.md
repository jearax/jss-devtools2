# Code standards

The toolchain here is the same one the CLI will generate for consumers, so it is a tested claim
rather than a preference. It is modelled on the `@jjuidev/design-system` configuration, trimmed to
what a Node CLI needs.

## Formatting

Prettier owns formatting. `pnpm format` rewrites files; `pnpm format:check` only reports.

Each setting is declared in exactly one file:

| Setting                                  | Value                                       | Declared in             |
| ---------------------------------------- | ------------------------------------------- | ----------------------- |
| Charset                                  | UTF-8                                       | `.editorconfig`         |
| Line endings                             | LF                                          | `.editorconfig`         |
| Indent                                   | Tabs, width 2; spaces for YAML and Markdown | `.editorconfig`         |
| Width                                    | 120                                         | `.editorconfig`         |
| Final newline, trailing whitespace       | Yes; Markdown keeps trailing whitespace     | `.editorconfig`         |
| Semicolons, quotes, arrows, commas       | Yes, single, always, none                   | `.prettierrc.json`      |
| Formatter, format and ESLint fix on save | Prettier, on, on                            | `.vscode/settings.json` |

`.editorconfig` holds every fact Prettier and the editor share. Prettier reads it by default
(`--no-editorconfig` opts out), and the recommended EditorConfig extension applies it in VS Code, so
neither `.prettierrc.json` nor `.vscode/settings.json` restates any of it. VS Code has no 120 ruler,
because the extension cannot read `max_line_length` and a ruler would be a second copy. See
[decisions/0017](./decisions/0017-shared-formatting-lives-in-editorconfig.md).

`.vscode/extensions.json` recommends Prettier, ESLint and EditorConfig.

`plans/` is excluded from Prettier. Those files are written by planning tooling, and Prettier's
Markdown table realignment rewrites every cell in them, which buries real edits in formatting churn.

## What counts as source

One expression defines the source file set, and it is the same everywhere:

```
{src,lib{,s},bin{,s},script{,s},tool{,s},config{,s},type{,s},test{,s},__test{s,}__,spec{,s},e2e}/**/*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}
*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}
```

Two patterns, because a folder pattern cannot reach the root config files and a root pattern cannot
descend. The first is the conventional folder set of a Node package, the second is the root. Both
carry the full extension set, so the list of extensions is stated once and never split by hand.

It appears in four places, and they are meant to stay in step:

| Where                         | Form                                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| `eslint.config.mjs`           | An IIFE derives every pattern from the folder and extension constants  |
| `package.json` `lint` scripts | `lint` and `lint:fix` only; `format` reuses `lint:fix`                 |
| `package.json` `lint-staged`  | The same two patterns joined into one key, plus JSON, Markdown, YAML   |
| `tsconfig.json` `include`     | `**/*`, because TypeScript's `include` supports only `*`, `**` and `?` |

`format` calls `pnpm lint:fix` rather than repeating the patterns, so the globs are written twice in
the whole manifest instead of three times.

lint-staged needs the two patterns joined as `{{folders}/**/*,*}.{extensions}` rather than as two
keys. A lint-staged pattern with no `/` matches a file's basename in any directory, so a separate
`*.{extensions}` key matched every source file, overlapped the folder key, and ran two editing task
chains on the same file at once. The joined key contains a `/`, so its `*` branch matches root files
only, and the staged set is exactly the set ESLint lints.

The ESLint config is the only place the union is computed, and it is computed rather than restated:
`CODE_EXTENSIONS` is built from `JAVASCRIPT_EXTENSIONS` and `TYPESCRIPT_EXTENSIONS`, so adding an
extension to either language cannot leave the general block behind.

Folders are listed, so a file outside them is never linted, by `pnpm lint` or by the pre-commit
hook. Type-checking is wider: `tsconfig.json` includes `**/*`, so a stray `scratch/x.ts` is
type-checked and can fail `pnpm typecheck`. Neither can reach the build, which only bundles
`src/cli.ts` and what it imports. The cost is that a genuinely new source folder has to
be added in the three places above, which is the point: it should be a decision, not a side effect.

A folder in the list that does not exist is harmless, because ESLint only fails when a pattern
matches nothing _at all_. That is why the list can name the whole Node ecosystem up front rather than
only the folders that happen to exist today.

`lib/` is in the list as source, not as build output. This repository builds to `dist/`, which is
ignored. If the build target ever moves to `lib/`, that directory must join `globalIgnores` and
`.gitignore` in the same commit.

Everything not wanted is still excluded rather than enumerated: `globalIgnores` in ESLint, `exclude`
in tsconfig, and `.prettierignore` for the formatter.

The one place the set is split is lint capability, because it is a real difference: TypeScript gets
type-aware rules, JavaScript gets the same rules with the type-aware set switched off.

In `.editorconfig` a setting that restates the value it inherits is dead weight, so the overrides
are limited to the ones that actually differ: YAML and Markdown indent with spaces, and Markdown
turns off trailing-whitespace trimming, because two trailing spaces are a hard line break there.

## Linting

ESLint flat config (`eslint.config.mjs`), built with ESLint core's `defineConfig()` and
`globalIgnores()` rather than `tseslint.config()`, which is deprecated.

| Area              | Rules                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Every source file | `js.configs.recommended`, the untyped `typescript-eslint` recommended rules, and the house style below |
| TypeScript        | `recommendedTypeChecked` with `projectService`, so type-aware rules can read types                     |
| JavaScript        | `disableTypeChecked`, because a type-aware rule with no `projectService` to read from is an error      |
| `tests/**`        | `@vitest/eslint-plugin` recommended rules                                                              |

House style applies to every source file, not only to JavaScript: `autofix/*`, `import-x/*`,
`prefer-arrow-functions`, `arrow-body-style` and `padding-line-between-statements` are all
language-agnostic, and scoping them to JavaScript would have left `src/*.ts` unchecked by them.

TypeScript and JavaScript are separate blocks on purpose. Type-aware rules need types, and the
`.mjs` config files sit outside the TypeScript program, so they get the untyped rules with the
type-aware set switched off. `projectService` is set only on the TypeScript block, so nothing asks a
JavaScript file for a program it does not have.

Both formatters are wired: `eslint-config-prettier` disables the ESLint rules that fight Prettier,
and `eslint-plugin-prettier` reports formatting as a lint error. So `pnpm lint` alone proves both.

Notable rules:

- `prefer-arrow-functions` and `arrow-body-style: always`. Functions are `const` arrow expressions
  with an explicit block body, never `function` declarations.
- `padding-line-between-statements` sets the blank-line rhythm: a line after a `const` block, and a
  line around a multiline block.
- `import-x/order` sorts `node:` builtins first, then external packages, then relative paths.
- `consistent-type-imports` with `prefer: type-imports`, matching `verbatimModuleSyntax`, which
  rejects a type imported without `import type` (TS1484). The opposite setting would make every
  type-only import fail either lint or typecheck.
- Vitest rules apply only to test files: the test folders and `*.test.*` or `*.spec.*` files, not
  to `src/`.

`dist/`, `coverage/`, `node_modules/`, `plans/` and `.agentkit/` are ignored.

TypeScript is pinned to 6.0.x because `typescript-eslint` requires `<6.1.0`. Do not bump it past
that until the peer range widens. `strictPeerDependencies` in `pnpm-workspace.yaml` is what makes
that peer range binding rather than advisory.

## Comments

A comment earns its place only when it explains something the code does not already show: the
reason, the constraint, the platform trap, the bug that motivated the rule.

| Keep                                         | Remove                                       |
| -------------------------------------------- | -------------------------------------------- |
| Why a rule or workaround exists              | Restating the next line or the function name |
| A constraint that is not visible in the code | Step-by-step narration of control flow       |
| The failure a guard was added to prevent     | Labels that name a category, not a fact      |
| Assumptions and edge cases                   | TODOs that name no actionable task           |

One line, or two when the second carries a new fact. Never three. Value is not length: a useful note
stays one line, and a padding paragraph stays gone no matter how true it is.

## Naming

- Files are kebab-case, including test files: `architecture-rules.ts`, `global-setup.ts`.
- One concern per file. Split a file once it passes roughly 200 lines and has separable parts.
- Prefer names that say what the thing is over names that say what it does.
- Comments explain why a decision was made. Delete a comment that only restates the code.

## TypeScript

- `strict`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` and
  `exactOptionalPropertyTypes`.
- `module` and `moduleResolution` are `NodeNext`, so relative imports carry a `.js` extension. This
  is stricter than the design-system's `Bundler` resolution, and deliberately so: this repo ships a
  real Node ESM artifact, and `NodeNext` is what proves the extensions are right.
- `verbatimModuleSyntax` is on: type-only imports must use `import type`.
- `noEmit`. tsdown builds; `tsc` only checks.
- `allowJs` and `checkJs` are off, so the `.mjs` config files are not type-checked and the repository
  carries no ambient declaration file. Type-checking them cost an ambient stub for a plugin that
  ships no types, and `tsc` still does not report `@deprecated`, which is the diagnostic that actually
  prompted the question. The `.ts` config files (`tsdown.config.ts`, `vitest.config.ts`) are still
  covered, because `include` is `**/*`.

## Tests

Vitest. Files live in `tests/`, matching `tests/**/*.test.ts`.

| Path                          | Holds                                          |
| ----------------------------- | ---------------------------------------------- |
| `tests/*.test.ts`             | The suites                                     |
| `tests/support/`              | Scanners and helpers shared by suites          |
| `tests/setup/global-setup.ts` | Builds the bundle once before any suite runs   |
| `tests/fixtures/`             | Deliberately broken inputs, kept out of `src/` |

Rules:

- A test that mirrors the implementation proves nothing. Assert observable behaviour: output, exit
  code, files written.
- A boundary rule gets a negative fixture. A rule with no fixture is a comment, not a rule.
- Tests that touch the filesystem use an OS temp directory, never a path inside the repository.
- `pnpm test` builds the CLI itself, so a green run also proves the build.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), enforced by `@commitlint/cli` through
the `commit-msg` hook. Subject line: `type: summary`, lower case, no trailing period.

Types in use: `chore`, `feat`, `fix`, `docs`, `test`, `refactor`, `ci`, `build`.

The `pre-commit` hook runs `lint-staged`: ESLint and Prettier over staged source and root config
files, Prettier over staged JSON, Markdown and YAML, and over `package.json` the pinned
`prettier-package-json` for canonical key order followed by Prettier for indentation. No two keys
match the same file, because lint-staged runs keys concurrently and two editing tasks on one file
race.

## Dependencies

- Exact versions only, no ranges. The lockfile is the source of truth. That includes tools a script
  or hook runs: they are devDependencies, never `pnpm dlx` with a range.
- `@types/node` follows the consumer floor's major line (22), not the development runtime, so `tsc`
  rejects a Node API the oldest supported runtime does not have.
- Runtime libraries go in `dependencies`, tooling in `devDependencies`, following Node convention.
- Every dependency added here is one the toolchain will generate for consumers, so it is a tested
  claim rather than a preference.
- Package that needs a native binding is allow-listed in `allowBuilds` in `pnpm-workspace.yaml`, so
  a build script never runs without being listed on purpose.

## Package manager

There is no `.npmrc`. pnpm reads every setting except auth and registry from
`pnpm-workspace.yaml`, so that file holds `strictPeerDependencies` and `allowBuilds`. There is no
`.nvmrc` either: `package.json` declares the Node floor.

Two floors, two numbers, because they are set by different packages:

| Floor       | Value           | Set by                                                     |
| ----------- | --------------- | ---------------------------------------------------------- |
| Consumer    | Node >= 22.12.0 | commander 15, the only runtime dependency the CLI ships    |
| Development | Node >= 22.13.0 | ESLint 10, declared as `>=22.13.0` in `devEngines.runtime` |

`devEngines.runtime` uses `onFail: error`, so pnpm enforces the development floor at install rather
than warning. Which Node a CI job runs is stated in the workflow, not the manifest: a developer floor
and a test target are different facts. The one exception is the `consumer-floor` CI job, which reads
the exact version from `engines.node` and runs the shipped bundle on it, because the toolchain
itself cannot install on that version.

`engineStrict` is deliberately not set. pnpm checks dependency engines against a version it resolves
from the declared range, not the Node actually running, so a range floor gets validated at one of
its boundaries. The project's own `engines.node` is enforced regardless of that setting.
