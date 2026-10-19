---
id: 0001
title: The source lives in yyyy and must be clean first
status: accepted
date: 2026-10-19
---

# 0001 The source lives in yyyy and must be clean first

## Context

The rewrite had no home. The working directory `yyyy` was empty apart from `plans/`, and was not a
git repository. Nothing had been decided about where the new CLI's own source would live, or in what
order things would be built.

## Decision

The source lives in `/Users/tandm/Desktop/yyyy`. The repository is initialised, the toolchain is
pinned, and the entry point is tested before any product feature is written.

## In the user's words

> "init source trên `yyyy` này, bản thân nó phải tốt / clean thì mới phát triển các tính năng khác
> được" (2026-10-19)

## Consequences

- Phase 0 builds no product command. That is deliberate, not an unfinished phase.
- The toolchain this repo uses is the toolchain the CLI will generate for consumers, so the config
  here is a tested claim rather than a preference.
