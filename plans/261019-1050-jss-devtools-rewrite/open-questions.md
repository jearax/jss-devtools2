# Open questions: jss-devtools rewrite

Each item is asked when the plan or implementation reaches the step it blocks, not up front. "Leaning" is a proposal with its reason. It is never a decision until the user answers. Background: [knowledge-base.md](./knowledge-base.md).

Status values: open, answered (with the user's words and the date).

## Foundation (before any code)

F1 is answered. F2 to F12 now block the first step, setting up a clean source foundation in `yyyy`, so they get raised while that step is planned.

| # | Question | Context | Leaning | Status |
|---|---|---|---|---|
| F1 | "Init self source": where and how is the new CLI's own source set up? | Answered: the source lives in `/Users/tandm/Desktop/yyyy` (empty except `plans/`, not a git repo yet). The foundation must be clean before any feature work. | - | answered: "init source trên `yyyy` này, bản thân nó phải tốt / clean thì mới phát triển các tính năng khác được" (user, 2026-10-19) |
| F2 | Linter and formatter for the CLI's own source | It dogfoods the toolchain the CLI generates for consumers. typescript-eslint 8.71 requires `typescript <6.1.0`, so TypeScript is pinned to 6.0.x. | - | answered: "ESLint + Prettier, TS 6.0" (user, 2026-10-19) |
| F3 | Dependency policy | Classify by the Node convention: runtime libraries in `dependencies`, tooling in `devDependencies`. Consequence of F7 (native install, no npm): the published artifact has no node_modules, so the build must inline runtime dependencies into the bundle. | - | answered: "deps hay dev-deps thì tuỳ kiến thức của nodejs mà cho vào phần tương ứng" (user, 2026-10-19) |
| F4 | CLI parser and TUI framework | | - | answered: "commander 15 + @clack/prompts 1.8" (user, 2026-10-19) |
| F5 | Build tool | | - | answered: "tsdown 0.23" (user, 2026-10-19) |
| F6 | Node floor for consumers | Principle: three supported lines back from the newest. On 2026-10-19 the supported lines are 26, 24, 22 (22 ends 2027-04-30). commander 15 needs >=22.12, clack 1.8 >=20.12, vitest 5 `^22.12 \|\| ^24 \|\| >=26`, tsdown 0.23 `^22.18 \|\| ^24.11 \|\| >=26`. Raise the floor to 24 when 22 reaches end of life. | - | answered: ">=22.12, CI chạy 22/24/26" (user, 2026-10-19), replacing the earlier ">=24" |
| F7 | Distribution | Install through native tools (curl, sh, wget). CI/CD does not touch npm. Deploy infrastructure is a VPS with Dokploy (`ssh vps-5890-ci`: Dokploy v0.30.8, Traefik, Docker 29; no GitHub Actions runner on it). Still open for the release phase: JS bundle that needs Node, or a single executable. | - | answered: "CICD không tương tác với NPM nữa, hạ tầng deploy bây giờ là VPS + dokploy ... Chỉ install qua native như curl, sh, wget,... thay vì NPM" (user, 2026-10-19) |
| F8 | Version for the first release of the rewrite: 0.7.0 or 1.0.0 | 0.x allows breaking changes. | none yet | open |
| F9 | Package manager | `packageManager` in the CLI repo only affects people who develop this repo, not consumers, and with native install the published package.json is never consumed. Pin the installed pnpm 11.24.0. User principle recorded: limit the maximum version a tool requires of consumers (corrected 2026-10-19). | pnpm 11.24.0 (dev only) | answered by explanation; user asked "chỗ này là consumer hay chỉ bản thân mình?" (2026-10-19) |
| F10 | Test runner | | - | answered: vitest 5 (option Q1, user, 2026-10-19) |
| F11 | Remote and CI | New GitHub repo `https://github.com/jearax/jss-devtools2` (does not exist yet on 2026-10-19). CI runs lint, typecheck, test, build. CD (release plus install site on Dokploy) belongs to the release phase. Still open at repo creation: visibility (public is needed if install.sh downloads GitHub release assets). | - | answered: "Tạo 1 github repo mới `https://github.com/jearax/jss-devtools2` để dùng" (user, 2026-10-19) |
| F12 | Agent setup for this repo | The repo uses AgentKit for now (`ak` 3.0.0-beta.25; `ak init` registers the project, kits are global). Docs follow the global CLAUDE.md layout. Not dogfooding its own harness yet. Still open: where decision records live (leaning `docs/decisions/`). | - | answered: "Chính nó dùng tạm `ak`" (user, 2026-10-19) |

## Toolchain module

| # | Question | Context | Leaning | Status |
|---|---|---|---|---|
| T1 | Dependency versions: an explicit tested table or live registry resolution? | JSS resolves from the registry (non-deterministic). H0 decision 0010 chose an explicit table. | explicit table | open |
| T2 | Scaffold an empty folder (git init, package.json, README), or only overlay an existing repo? | JSS roadmap says scaffolding is out of scope. H0 decisions 0019 and 0020 scaffold. | overlay only | open |
| T3 | Which presets ship first, and in what order? | Roadmap: react (Vite), next, nest, rn (Expo). | none yet | open |
| T4 | Keep the current `init` flags and the JSON result as a contract? | Has consumers only if someone scripts it. | none yet | open |

## Harness module

| # | Question | Context | Leaning | Status |
|---|---|---|---|---|
| H1 | Onboarding: ask first, or force-run the skill? | Earlier the user said "force run skill". H0 decision 0018 asks first, and 0014 rejected auto-run. A hook cannot force a skill in an interactive session; the Stop hook can push one prompt. | none yet | open |
| H2 | Updating managed files: three-way merge (K1, H0) or hash drift plus git? | Managed files are "never edit" by policy, and the flows require a clean tree. | hash drift plus git | open |
| H3 | Does the CLI commit after init/update (H0 0009), or only suggest the command (like 0017)? | | suggest only | open |
| H4 | Review trigger: tree changed, failures, counters (K2)? | H0 decision 0021 was reverted pending review. | none yet | open |
| H5 | Curator and usage tracking in the first release? | No usage data yet. H0 deferred archiving until 10 learned skills. | defer | open |
| H6 | How do hooks run in a consumer repo: a vendored bundle (H0 0002), small standalone scripts, or `npx`? | Teammates must not need anything installed. `npx` per hook is slow. | small standalone scripts | open |
| H7 | AgentKit integration: keep `--agent-kit` (H0 0013)? Do the asset variants stay? | | keep the flag, drop the variants | open |
| H8 | Knowledge layout: `.harness/` (memory, docs, decisions, plans) as in H0, or K1's layout? | | none yet | open |
| H9 | Skills explicit-only (K1) or auto-triggered by description (H0 and K2)? | K1 and K2 disagree on purpose. | none yet | open |
| H10 | Learned skills: may the review edit any non-managed skill, or only `created_by: agent` ones (K2)? | | none yet | open |
| H11 | Can harness be installed without the toolchain (for example on a biome repo)? | | none yet | open |
| H12 | Only Claude Code, with no agent registry (H0 0004)? Placeholder for others? | The user earlier allowed a placeholder "if effort is low". | none yet | open |

## Cross-cutting

| # | Question | Context | Leaning | Status |
|---|---|---|---|---|
| X1 | Exit codes: H0's 0/1/2/3 or JSS's 0/1? | | none yet | open |
| X2 | Which H0 decisions carry over into the new repo, and which are superseded? | 20 decisions in `.harness/decisions/`. | review one by one during planning | open |
| X3 | What happens to the old repos (jearax/harness, the install site)? | | none yet | open |
