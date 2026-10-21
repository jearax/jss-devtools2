---
title: Cooked the extensionless imports
date: 2026-10-21
summary: "Dropped the .js extension from every @/ and ./ import by switching TypeScript to Bundler resolution, made ESLint reject an extension, and fixed the architecture rule that went blind to extensionless imports"
---

# Cooked the extensionless imports

## What happened

The [extensionless imports plan](../261021-1609-extensionless-imports/plan.md) was cooked.
`tsconfig.json` now sets `"module": "Preserve"` and `"moduleResolution": "Bundler"`, every `@/` and
`./` import carries no file extension, and ESLint rejects one. The bundle is the same bytes as
before.

## Findings

- **The bundle did not move.** The sorted-line diff against the pre-change build is 0, and the
  sha256 is the same: `c4a5c77195e16984…`. The specifier never reaches the artifact, because the
  bundler resolves it at build time.
- **One rule went blind and the suite did not notice.** `runner-in-adapters-only` matched the
  literal `run-command.util.js`, so an extensionless import of the runner passed unseen, and the
  fixture still carried the extension, so the suite stayed green. The pattern is now
  `run-command\.util(?:\.js)?` and the fixture carries no extension.
- **The ESLint pattern is narrower than it looks.** `^(?:@/|\.{1,2}/).+\.(?:js|ts)$` needs a
  literal dot before `js` or `ts`, so `./scripts/package-info.mjs` is still allowed, which matters
  because Node loads the root config files directly.
- **The extension is a fact, not a style.** 27 files carried it, and every one of them changed in
  one pass.

## Also

- The `NodeNext` deviation in decision 0014 is marked superseded by decision 0028, and the
  extension bullet in decision 0025 points at it.
- No comment was added: the resolution change and the pattern change are clear from the code.
- The gate is green on Node 24.11.0: lint, typecheck, 112 tests in 14 files, build, format.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
