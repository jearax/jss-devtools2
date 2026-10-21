# Review: phase 0 + toolchain alignment (HEAD 173b5c0)

Scope: 18 commits on `main`, plans `261019-1055-phase-0-source-foundation` and `261019-0625-toolchain-alignment`, all of `src/`, `tests/`, config and docs. Every conclusion below was reproduced on a clean clone (`git clone` into the scratchpad), not taken from the journal.

## Gate results

- Clean clone, Node 24.21.0: `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build` green, 3 test files, 14 tests.
- CI `jearax/jss-devtools2` (public): the 3 latest runs are `completed success`, including `173b5c0`.
- Docs: no broken relative link; the only "TODO" is a word in the rule table of `docs/code-standards.md:131`, not a marker.
- The acceptance criterion "unknown command with a suggestion" is not met, and the journal states why (commander 15 suggests only once a subcommand exists). Acceptable.

## Findings (most severe first)

### 1. Critical: run through a symlink, the CLI does nothing and exits 0

`src/cli.ts:82-94`. `isDirectRun()` compares `process.argv[1]` with `import.meta.filename`. Through a symlink, `argv[1]` is the link path while `import.meta.filename` is the real path, so the guard returns `false` and `main()` never runs.

Reproduction: `ln -s dist/cli.mjs bin/jss-devtools`. Then `bin/jss-devtools --version` prints nothing and exits 0, and `bin/jss-devtools nope` also prints nothing and exits 0.

A symlink is exactly how pnpm/npm bin shims and most `curl | sh` installers put a CLI on `PATH`. So this is the very class of defect, "a crash becomes exit 0", that this rewrite was built to prevent. `tests/bundle.test.ts` does not catch it because it runs `node cli.mjs` directly.

The minimal fix compares real paths, with a test that runs through a symlink:

```ts
import { realpathSync } from 'node:fs';

const isDirectRun = (): boolean => {
	const entry = process.argv[1];

	if (!entry) {
		return false;
	}

	try {
		return realpathSync(entry) === import.meta.filename;
	} catch {
		return false;
	}
};
```

```ts
it('runs through a symlink, the way bin shims and installers link it', async () => {
	await symlink(resolve(sandbox, 'cli.mjs'), resolve(sandbox, 'jss-devtools'));
	const { stdout } = await run(process.execPath, ['jss-devtools', '--version'], { cwd: sandbox });

	expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
});
```

The sturdier option drops the guard entirely: move `createProgram`, `main` and `reportFatalError` into their own module, so `src/cli.ts` is only `await main()`. No "silent" branch is left to get wrong, but the architecture rule's allow-list has to change.

### 2. High: no type-only import can pass both lint and typecheck

`eslint.config.mjs:108` sets `consistent-type-imports` with `prefer: 'no-type-imports'`, while `tsconfig.json:17` enables `verbatimModuleSyntax: true`.

- `import type { OptionValues } from 'commander'` makes ESLint report "Use an `import` instead of an `import type`".
- `import { OptionValues } from 'commander'` makes tsc report TS1484 "must be imported using a type-only import when 'verbatimModuleSyntax' is enabled".

It has not surfaced yet because `src/` only imports the class `Command` (a value). The first type import in the core module plan will be blocked, and `eslint --fix` in pre-commit will even rewrite the code into a form tsc rejects.

Fix: `['error', { prefer: 'type-imports' }]`. The rule was likely copied from design-system, which uses `moduleResolution: Bundler` and may not enable `verbatimModuleSyntax`.

### 3. Medium: lint-staged globs overlap, so several tasks write the same file in parallel

`package.json:64-79`. Per the lint-staged README, a glob without `/` turns on `matchBase`, so `"*.{cjs,…,tsx}"` matches every code file in every folder.

- **Two chains write one file at once.** Every file in `src/` matches both the folder glob and the root glob. lint-staged runs globs in parallel, so two `eslint --fix` → `prettier --write` chains write the same file. The README calls this exact situation a race condition.
- **The folder allow-list is defeated.** A file in `scratch/` also matches the root glob and is still linted at commit.
- **`package.json` has two formatters writing in parallel.** It matches both `**/*.{json,…}` (prettier) and `package.json` (`prettier-package-json`).
- **An unpinned package is fetched over the network at commit.** `pnpm dlx prettier-package-json@^2.8.0` uses a range, against the "Pin what you install" rule in CLAUDE.md.

### 4. Medium: the source glob is copied in 4 places though ESLint needs it in one, and the docs are wrong about typecheck

- **ESLint does not need a glob in the script.** `eslint .` lints exactly the 13 files the script glob lints (compared with `--debug`, the `diff` is empty), because flat config selects files by `files`. So the globs in `lint`, `lint:fix` and `lint-staged` are redundant copies of one fact. That directly breaks "One fact, one home", and it explains why 6 refactor commits only reshaped globs.
- **The docs are wrong about typecheck.** `docs/code-standards.md` says "a file outside them is never linted or type-checked". But `tsconfig.json` uses `include: ["**/*"]`, and an experiment shows a type error in `scratch/x.ts` fails `pnpm typecheck`.

Proposal (keeps your allow-list intent, gathered into one place, `eslint.config.mjs`):

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"lint-staged": {
	"*.{cjs,mjs,js,jsx,cts,mts,ts,tsx}": "eslint --fix --no-warn-ignored",
	"*.{json,md,yml,yaml}": "prettier --write"
}
```

- `--no-warn-ignored` lets lint-staged pass files outside the allow-list without a warning.
- `prettier --write` after `eslint --fix` is redundant, since `prettier/prettier` is already an ESLint rule.
- For typecheck: either narrow `include` to match the allow-list, or fix the sentence in the docs.

### 5. Medium: `TEST_FILES` equals `TYPESCRIPT_FILES`, so vitest rules apply to `src/`

`eslint.config.mjs:21` and `:23` produce the same pattern. Reproduction: `src/leak.ts` containing `it('x', () => {})` is reported by `vitest/expect-expect`.

Fix: `TEST_FILES` holds only the test folders (`test{,s}`, `__test{s,}__`, `spec{,s}`, `e2e`) plus `**/*.{test,spec}.*`.

### 6. Medium: `.gitignore` does not block `.env.production`, `.env.staging`

`.gitignore:10-11` only has `.env` and `.env.*.local`. Phase 1 asked for `.env.*`, and your global rule forbids committing dotenv files. Design-system (`.env*.local`) has the same gap, so copying it copied the gap.

Fix: replace with `.env*` plus `!.env.example`. Fix `.prettierignore` the same way.

### 7. Medium: the consumer floor 22.12 has never been verified

- **CI runs only the latest patch.** `pnpm/setup` with `node@22` takes the latest 22.x, so no job actually runs `engines.node >=22.12.0` on 22.12. The test suite cannot run on 22.12, because tsdown needs `^22.18` and devEngines needs `>=22.13`. Running `dist/cli.mjs` alone works, though: build on 24, then `node@22.12.0 dist/cli.mjs --version`.
- **Node's types drift from the floor.** `@types/node` is `26.6.5`, so tsc allows APIs that exist only on Node 24 or 26, and the bundle would break on the published floor. Pin `@types/node` at `22.x` so the types match the floor.

### 8. Low

- **`.editorconfig` disagrees on tab width.** `.editorconfig` sets `tab_width = 4`, while `.prettierrc.json` has `tabWidth: 2` and `.vscode/settings.json` has `editor.tabSize: 2`. One fact has two values, so the editor shows tabs 4 wide while prettier computes `printWidth: 120` with 2, and the 120 ruler is off. The value was copied from design-system, which is your decision, so I ask rather than fix (see the question below). The alignment plan's success criterion "agree with each other" is not true yet.
- **Decision 0006 still has an old sentence.** `docs/decisions/0006-consumer-node-floor.md:20-21` still says "Development uses Node 24, which `devEngines.runtime` declares", while the current value is `>=22.13.0`.
- **`minimumReleaseAgeExclude` is about to become dead config.** `pnpm-workspace.yaml:6-12` lists the commitlint 21.2.4 releases, published 2026-10-18 12:52Z. Once they are old enough for pnpm's window, these lines do nothing; delete them at the next bump.
- **`@clack/prompts` is unused.** It is a runtime dependency that nothing imports (per "Write what exists"). It can come back with the first prompt.
- **`addUnknownCommandFallback` has an expiry date.** It becomes dead code as soon as the first command exists. Note it in the first phase of the core module plan for removal.
- **Name and description are copied in two places.** `'JavaScript stack dev tools CLI'` and `'jss-devtools'` are in both `package.json` and `src/cli.ts:6-10`, while the version is injected. Inject them with the version, or accept it; minor.

## What is good

- **Exit codes are right.** `CommanderError.exitCode` is honored in `main()`, so `--help`/`--version` still exit 0 despite the top-level catch.
- **The architecture test has a negative fixture per rule,** plus a "one fixture per rule" test.
- **The bundle test runs from the OS temp dir,** so it cannot resolve up into the repo's `node_modules`.
- **CI follows the chosen pattern:** actions pinned by SHA, `persist-credentials: false`, `contents: read`.
- **The journal is honest,** recording both the `rm -rf tests` mistake and the wrong diagnosis of the globs.

## Unresolved questions

1. Is `tab_width = 4` in `.editorconfig` a deliberate design-system choice (wider code reading) or a copied mistake? I lean towards `2` to match prettier and VS Code.
2. Finding 1: minimal fix (`realpathSync`) or split the entry? I lean towards the minimal fix plus a symlink test now; the module split goes to the core module plan, where the layout is decided.
3. Finding 4: do you agree to move to `eslint .`, so the allow-list lives only in `eslint.config.mjs`? It partly reverses the glob refactor chain you approved.
