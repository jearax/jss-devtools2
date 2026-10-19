---
id: 0016
title: Config files export a named const
status: accepted
date: 2026-10-19
---

# 0016 Config files export a named const

## Context

The toolchain configuration files originally exported their value inline, so the export statement was
the whole configuration. Naming the value makes the export line say what it exports, keeps the diff
on the export line when the body changes, and matches the convention already used across the other
repositories.

## Decision

Every config file assigns to a named const and exports that const.

```js
const eslintConfig = tseslint.config(/* ... */);

export default eslintConfig;
```

## In the user's words

> "Với các config files phải có dạng: `export default xyzConfig` thay vì `export default ...`"
> (user, 2026-10-19)

## Consequences

- Applies to `eslint.config.mjs`, `commitlint.config.mjs`, `tsdown.config.ts` and `vitest.config.ts`.
- The name must be descriptive of the file: `eslintConfig`, `commitlintConfig`, `tsdownConfig`,
  `vitestConfig`.
