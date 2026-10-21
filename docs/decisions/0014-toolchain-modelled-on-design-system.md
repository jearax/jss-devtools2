---
id: 0014
title: One toolchain, modelled on design-system
status: accepted
date: 2026-10-19
---

# 0014 One toolchain, modelled on design-system

## Context

Phase 0 built a working but thin toolchain: bare ESLint recommended, no editor settings, and two
config files describing the same facts. The `@jjuidev/design-system` repository already carries a
mature version of the same setup. Since this CLI generates this exact toolchain for consumers, its
own repository should be the first, strictest user of it.

## Decision

Adopt the design-system configuration as the base, trimmed to what a Node CLI needs.

- Config files assign to a named `const` and then `export default <name>Config`, so the value is
  readable at the export line and diffs stay narrow.
- Prettier, ESLint, EditorConfig and VS Code settings agree with each other: tabs, indent size 2,
  display width 4, width 120.
- ESLint gained `autofix`, `import-x`, `prefer-arrow-functions`, `prettier`, and typed rules through
  `projectService`. It uses ESLint core's `defineConfig()`, not the deprecated `tseslint.config()`.
  ESLint 9 was considered and rejected: it reached end of life on 2026-08-06 and is deprecated on
  npm, so the reference repository's `^9.39.5` is no longer a safe floor to copy.
- Tests get `@vitest/eslint-plugin`.
- Husky hooks carry an explicit `#!/usr/bin/env sh` shebang.

## In the user's words

> "Với các toolchain cần update đầy đủ thêm (ví dụ như tab, tab size, format, vscode,...) và base dựa
> trên config của `/Users/tandm/Documents/jearax/dokploy/design-system`." (user, 2026-10-19)

## Consequences

- Formatting is now a lint concern as well as a Prettier concern, so `pnpm lint` alone proves both.
- Semicolons are back on, matching the reference. This rewrote every source file once.
- `moduleResolution` stayed `NodeNext` rather than the reference's `Bundler`. This repository ships a
  real Node ESM artifact, and `NodeNext` was what proved import extensions were correct. This was
  the one deliberate deviation, recorded here so it does not read as an oversight. Superseded by
  [decision 0028](./0028-extensionless-imports.md): the resolution is `Bundler` now, and an import
  carries no extension.
- Adding typed lint rules surfaced two real defects immediately, one of which was a reach into a
  commander's private method. Both are fixed rather than suppressed.
- The `no-restricted-syntax` ban on `enum` was added with the first version of this config and later
  removed (user, 2026-10-19). It encoded a style preference as a hard error without evidence that it
  was the right call, which is the same mistake the repo's own rules warn against.
- Copying the reference did not mean copying its dead settings. Its `.editorconfig` overrides
  `indent_size` to `2` under `[*.{yml,yaml}]` and `[*.md]`, which is the value `[*]` already sets, so
  both blocks changed nothing. They were dropped here. The reference repo is a source of defaults,
  not of settings to inherit unchecked.

## Later

The three files did not agree on tab width: `.editorconfig` said 4, Prettier and VS Code said 2.
Decision 0017 makes `.editorconfig` the only home for every formatting fact Prettier and the
editor share.
