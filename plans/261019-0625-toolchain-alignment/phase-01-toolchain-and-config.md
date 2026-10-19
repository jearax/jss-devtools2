---
phase: 1
title: "Config export naming, toolchain completion, dotfile removal"
status: completed
priority: P1
effort: "1.5h"
dependencies: []
---

# Phase 1: Config export naming, toolchain completion, dotfile removal

## Goal
Bring the toolchain to the design-system baseline, name every config export, and remove the two
dotfiles whose contents belong in files that read them properly.

## Context
- Reference: `/Users/tandm/Documents/jearax/dokploy/design-system`. It has no `.npmrc` and no
  `.nvmrc`; its settings live in `package.json` and `pnpm-workspace.yaml`.
- pnpm documents that only auth and registry settings are read from `.npmrc`. Everything else comes
  from `pnpm-workspace.yaml`, where `engineStrict` and `strictPeerDependencies` are both valid keys.
- `pnpm/setup` v3 documents that it reads `devEngines.runtime` from `package.json` and installs the
  runtime with no workflow input.
- The user answered two questions before implementation: base the toolchain on design-system, and
  merge `.npmrc` and `.nvmrc` into `package.json` if possible.

## Files to change
- `eslint.config.mjs`, `commitlint.config.mjs`, `tsdown.config.ts`, `vitest.config.ts`: named const
  exports; fuller ESLint rule set.
- `.prettierrc.json`: `semi: true`, drop the JSON/YAML indent override.
- `.editorconfig`: adopt the reference's fuller form.
- `.vscode/settings.json`, `.vscode/extensions.json`: new.
- `.prettierignore`: regroup with reasons.
- `.husky/pre-commit`, `.husky/commit-msg`: explicit `sh` shebang.
- `package.json`: `devEngines.runtime`, new scripts, reference-shaped `lint-staged`.
- `pnpm-workspace.yaml`: `engineStrict`, `strictPeerDependencies`, `allowBuilds`.
- Delete `.npmrc`, `.nvmrc`.
- `src/cli.ts`, `tests/cli.test.ts`: fix what the typed lint rules surface.
- `.github/workflows/ci.yml`: stop hardcoding the runtime.
- `docs/`, `README.md`, `CLAUDE.md`, decision records 0014 to 0016.

## Steps
- [x] Read the reference config and confirm each setting's current documented behaviour.
- [x] Add the plugin dependencies, allow-list the native binding in `allowBuilds`.
- [x] Rewrite the four config files.
- [x] Adopt Prettier, EditorConfig and VS Code settings.
- [x] Move `.npmrc` settings to `pnpm-workspace.yaml`, replace `.nvmrc` with `devEngines.runtime`.
- [x] Fix everything the typed lint rules surface rather than suppressing it.
- [x] Reformat, then run the full gate from a clean clone.
- [x] Update docs, decisions and this plan.
- [x] Migrate ESLint off the deprecated `tseslint.config()` to `defineConfig()`, composing shared
      configs into the array rather than through `extends`, whose glob intersection does not survive
      `typescript-eslint`'s own globs.
- [x] Widen `devEngines.runtime` to `>=22.13.0` with `onFail: error`, so it matches `engines.node`
      and is enforced at install rather than warned about.
- [x] Give the source file set one canonical expression, `**/*.{cjs,mjs,js,jsx,mts,ts,cts,tsx}`,
      reused by the ESLint config, the `lint` scripts, `lint-staged` and `tsconfig.json`.
- [x] Rewrite the ESLint config on the documented typed-linting shape: one baseline block, one
      `recommendedTypeChecked` block for TypeScript, one `disableTypeChecked` block for JavaScript.
      No spreading shared configs into the array, and no `disableTypeChecked` re-scoping hack.
- [x] Remove the `no-restricted-syntax` ban on `enum`.
- [x] Apply the house-style rules to every source file rather than to JavaScript only. Autofix then
      found a real import-order bug in `tests/bundle.test.ts` and several single-line `if` bodies
      that had never been checked.
- [x] Align `.gitignore`. It was excluding `.vscode/`, which meant the two settings files three
      documents link to were never committed.
- [x] Cut code comments down to the ones that carry a fact the code does not already show.
- [x] Derive `CODE_FILES` from the JavaScript and TypeScript extension sets instead of restating
      the union, so the general block cannot fall behind either language.
- [x] Drop the `.editorconfig` overrides copied from the reference that restated the value they
      inherited, and all comments from the config files that only listed patterns.

## Verification
- `pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test && pnpm build` from a
  clean clone.
- `.npmrc` and `.nvmrc` absent; `pnpm config` still reports the settings it needs.
- `dist/cli.mjs` still runs standalone with no `node_modules`.
- CI green on Node 22, 24 and 26.

## Risks
- pnpm's runtime manager resolves `devEngines.runtime` to a concrete Node and installs it. With
  `onFail: download` and `^24.0.0` it picked 24.0.0, which `engineStrict` then rejected against
  tsdown. Resolved with `onFail: warn` and `^24.11.0`; recorded in decision 0015.
- `eslint-plugin-import-x` pulls `unrs-resolver`, which needs a build script. Allow-listed, the same
  way the reference does it.