# Init flow discussion: decision log

Started 2026-10-22. Diagram: [init-flow.html](./init-flow.html), source
[init-flow.diagram.json](./init-flow.diagram.json). Earlier flow and D/T table:
[planner-261021-1637-init-command-workflow.md](../reports/planner-261021-1637-init-command-workflow.md).

Each entry is decided by the user and quotes them. Anything not listed here is still open.

## How the work is ordered

> "trước tiên, cũng scaffold command init structure trước nè, rồi xác định các flags phụ trước (tức là
> case dễ xử lý trước, case khó cùng khảo luận, ví dụ: -y|--yes, --no-*, --json để dùng với | jq,
> dry, --help,....)" (user, 2026-10-22)

- P1: the auxiliary flags, one at a time, into a contract table.
- P2: the `init` folder structure, wired with the P1 flags, running end to end on an empty preset.
- P3: the hard cases, discussed together: T2, preflight, preset, `package.json` changes, conflicts,
  failure half way.

## The main use case

> "Usecase chính của CLI này chủ yếu là init repo, kiểu như vite create á." (user, 2026-10-22)

T2 is answered: both, with a rank.

> "Usecase có 2 trường hợp chính: Init từ đầu luôn là usecase chính. Init vào repo đã có sẵn là
> usecase phụ (tôi đang nghĩ sẽ dựa vào entrypoint là file package.json á, không biết ổn không)"
> (user, 2026-10-22)

- Primary: create a project from nothing, the way create-vite does.
- Secondary: set up an existing repository.
- Proposed by the user, under discussion: `package.json` in the target folder decides which of the two
  runs. The edge cases are being decided one at a time below.
- Monorepos are not supported: "Không/chưa support mono repo." (user, 2026-10-22)
- The user asked to trim the edge cases: "Chốt ý này, xem có thu gọn được scope tí nào không nha."

### Strategy for every edge case

> "Quan điểm, strategy, chủ yếu focus usecase chính, case nào edge quá thì xử lý dạng exit 1 + thông
> tin, gợi ý next step." (user, 2026-10-22)

An edge case gets no mode, no merge and no prompt of its own: it exits 1, says what was found, and
names the next step.

### The syntax picks the mode

> "Ý tôi muốn thu gọn flow/usecase/hạn chế edgscase á, miễn sao flow nó hợp lý là được. Có dir được
> hiểu là luôn tạo mới dir đó, có ổn / hợp lý / đúng không." / "Chốt flow này, qua câu tiếp theo"
> (user, 2026-10-22)

What the user typed decides the mode; the folder's content is only checked, never used to guess.
This replaces an earlier draft where the folder's content picked the mode.

| Command | Mode | Passes when | Otherwise, exit 1 with |
|---|---|---|---|
| `init <dir>` | Create a project (primary) | `<dir>` is missing or empty; `init .` works in an empty folder | "my-app is not empty; to set up the project in it: cd my-app && jss-devtools init" |
| `init` | Set up the current folder (secondary) | `./package.json` exists and parses | "no package.json here; to create a project: jss-devtools init <name>" |
| `init` | | | a `package.json` that does not parse: the parse error |
| `init` | | | `workspaces` in `package.json`, or `pnpm-workspace.yaml` next to it: "monorepos are not supported yet" |

A folder with files and no `package.json` fails both commands, so it needs no rule of its own.
Narrowed on 2026-10-27: `pnpm-workspace.yaml` counts as a monorepo only when it has a `packages`
field ("1 OK", user). Since pnpm 10 the file also holds settings for a single package, pnpm 11 writes
it on its own to record `allowBuilds` placeholders, and a project `init --pm pnpm` creates has one;
the pnpm docs: "If the `packages` field is omitted, only the root package is included in the
workspace."

Known limit: a package inside a monorepo has its own `package.json` and no workspace file, so it is
set up as a single repository. Accepted for the first version. Narrowed on 2026-10-27: such a
package has no `.git` of its own, so the git check under "Git in an existing repository" stops it
with exit 1.

- The flow diagram is redrawn once the cases are settled ("bạn vẽ lại flow sau khi chốt cho trực
  quan nhé").

### What init manages: the user's draft (under analysis)

The user's draft, 2026-10-22, verbatim:

> "Sẽ tương tác: eslint.config.mjs, .prettierrc.json, .editorconfig, .husky/, .gitignore
> Logic behaivior chắc chắn.
> + package manager support: npm (default, suy ra support nhận flag --pm cho case init mới từ đầu),
>   yarn 1.x, bun, pnpm -> cần mapping giữa scripts và mọi nơi dùng, dùng detect package manager.
> + Có dùng `prettier-package-json`
> + nội dung eslint.config.mjs thì tuỳ vào flag framework=node|react|rn|next|nest, chỉ là các enum
>   ready for scale-up, chưa implement, default là node. Khi là node cần xử l1y algin cho các giá trị
>   của tsconfig.json cho hợp lý, có thể là type: module, packageManager: pnpm@…, engines.node....
> + .vscode/ là default => có flag --no-vscode
> + Có flag --no-intsall, default: false
> + Nội dung gitignore phải hợp lý.
> Đang cân nhắc, phân vân chức năng alias import."

Decided by the user ("chắc chắn"): four package managers (npm default, yarn 1.x, bun, pnpm) with
`--pm` for a new project and detection for an existing one; `prettier-package-json`; `--framework`
with `node` as default; `.vscode/` written by default with `--no-vscode`; `--no-install`. Open: the
gaps raised in the analysis that follows.

`--no-install` is withdrawn: "Không dùng --no-linter, --no-commitlint và cả --no-install" (user,
2026-10-27). A real run always installs; only `--dry-run` skips it. The opt-out flags left are
`--no-vscode` alone.

#### `--framework` lists the whole enum (2026-10-27)

> "--framework cả enum." (user, 2026-10-27)

`--help` lists `node`, `react`, `rn`, `next` and `nest`, with `node` as the default. Only `node` is
built. Under the edge-case strategy, any other value exits 1 with "react is not supported yet; only
node is".

#### Package manager (2026-10-27)

> "Tương tự câu 1, ở repo có sẵn --pm không có tác dụng -> exit 1, ở repo có sẵn phải tự detect theo
> lib `https://www.npmjs.com/package/package-manager-detector` chẳng hạn, trường hợp có nhiều pkg
> manager, thì theo lib detected theo strategy default, hoặc bạn có thể inspect trategy default nếu
> thấy không ổn thì thiết lập lại theo quy tắc bun -> pnpm -> yarn (1x) -> npm." (user, 2026-10-27)

- `init <dir>`: `--pm npm|yarn|pnpm|bun`, default `npm`.
- `init` with `--pm`: exit 1, "--pm only applies when creating a project; here the package manager
  is detected".
- `init` detects with `package-manager-detector` (1.9.0, inspected in `dist/detect.mjs`).

What its default strategy does, and the one change it needs:

- The default strategies are `lockfile`, `packageManager-field` and `devEngines-field`. Within one
  folder the lockfiles are tried in this order: `bun.lock(b)`, `deno.lock`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, `yarn.lock`, `package-lock.json`. For the four supported managers this is
  the user's order: bun, pnpm, yarn, npm. Kept.
- When a lockfile is found and `package.json` has `packageManager`, the field wins over the lockfile.
  Kept: it is what the repository declares.
- It walks up through every parent folder to the filesystem root. Probed 2026-10-27: a folder with
  only `package.json` inside a parent holding `package-lock.json` is detected as npm from the
  parent. Changed: `stopDir` is set to the project folder, so only the project itself is read.
- Nothing found (no lockfile, no field): npm, the last entry of the user's order and the default.
- A result outside the four (`yarn@berry` from `packageManager: yarn@2+`, `pnpm@6`, `deno`, and the
  others the library knows) exits 1 with "<name> is not supported; supported: npm, yarn 1, pnpm,
  bun".
- Known limit: `yarn.lock` without a `packageManager` field is reported as yarn classic even when the
  repository uses yarn 2+. Accepted: the commands init runs (`install`, `add -D`) are the same in
  both.

### Import alias

> "Thu gọn được scope như sau: init có cung cấp alias import, tsx + tsc alias thôi, có flag
> —import-alias" (user, 2026-10-24)

- `init` sets up an import alias, default `@/*`, changed with `--import-alias <prefix/*>`.
  Superseded on 2026-10-27: no `--import-alias`, see below.
- The `node` preset runs TypeScript with `tsx` in development and builds with `tsc` followed by
  `tsc-alias`, which rewrites the alias to relative paths so plain `node` runs the output.
- Probed 2026-10-24 on Node 24.11.0 with `paths: { "@/*": ["./src/*"] }`: `tsc` alone typechecks
  green but `node dist/index.js` fails with `ERR_MODULE_NOT_FOUND: Cannot find package '@/utils'`;
  `tsx src/index.ts` (tsx 4.23.15) runs; `tsc` then `tsc-alias` (1.9.9) rewrites the import to
  `./utils/hello.js` and `node dist/index.js` runs.

#### Where the alias applies (2026-10-27)

> "init ở repo có sẵn không quản lý alias import" / "Bỏ qua flag `--import-alias`, chỉ sử dụng
> default là `@`, expect CLI này là user tự sửa sau khi gen nếu có nhu cầu." (user, 2026-10-27)

- `init <dir>` (create): always writes `paths: { "@/*": ["./src/*"] }`. No flag changes it; the user
  edits `tsconfig.json` afterwards if they want another prefix.
- `init` (existing repository): never touches the alias, `paths` or the dev and build scripts.
- No `--import-alias` flag, so there is nothing to reject in either mode.

#### Module settings for the `node` preset (2026-10-27)

> "Dùng gì cũng được, ưu tiên dùng hiện đại, ví dụ NodeNext. Cứ kiểm tra lại đi." (user, 2026-10-27)

First assumed `module` and `moduleResolution` `nodenext` with `type: module`. Probed 2026-10-27 on Node 24.11.0
with TypeScript 6.0.3, tsx 4.23.15 and tsc-alias 1.9.9, `paths` set and no `baseUrl`:

| Import in `src/index.ts` | `tsc` | `tsc-alias` then `node dist/index.js` | `tsx` |
|---|---|---|---|
| `@/utils/hello.js` | green | runs | runs |
| `@/utils/hello` (no extension) | TS2307 cannot find module | runs (tsc-alias adds `.js`) | runs |
| `./utils/hello` (relative, no extension) | TS2835 needs an explicit extension | `ERR_MODULE_NOT_FOUND` | runs |
| `@/utils/hello.ts` with `rewriteRelativeImportExtensions` | TS2877: an alias is not a relative path, so it is not rewritten | `ERR_MODULE_NOT_FOUND` | runs |

That table holds only for `"type": "module"`. Corrected on 2026-10-27 after the user pointed to
their NestJS repository (`jjuidev-vps/auth`): `module: nodenext`, `paths: { "@/*": ["./*"] }`,
extensionless imports such as `@/core/cache/cache.module`, and no `type` field in `package.json`.
Under `nodenext` the `type` field decides the output format, so that repository is CommonJS and
CommonJS resolution needs no extension. Probed again on 2026-10-27, same toolchain:

| Package | `module` / `moduleResolution` | Extensionless `@/…` and `./…` | Output |
|---|---|---|---|
| no `type` / `commonjs` | `nodenext` / `nodenext` | `tsc` green, `node` runs | CommonJS `require` |
| `type: module` | `nodenext` / `nodenext` | `tsc` TS2307 / TS2835 | ESM, needs `.js` in source |
| `type: module` | `esnext` / `bundler` | `tsc` green; `tsc-alias --resolve-full-paths` adds `.js` and `/index.js`; `node` runs | ESM |

Also found: TypeScript 6.0 rejects `baseUrl` with TS5101 ("deprecated and will stop functioning in
TypeScript 7.0") unless `ignoreDeprecations: "6.0"` is set. `paths` without `baseUrl` works, so the
generated `tsconfig.json` has no `baseUrl`.

Decided: the third row. "6c" (user, 2026-10-27).

- `package.json` has `type: module`; `tsconfig.json` has `module: esnext`,
  `moduleResolution: bundler`, `paths` and no `baseUrl`.
- Imports are written without extensions. `build` is `tsc && tsc-alias --resolve-full-paths`, which
  rewrites the alias and adds `.js` and `/index.js`; `dev` runs `tsx`.
- Accepted risk: `tsc` no longer checks paths the way Node resolves them, so a runnable `dist/`
  depends on tsc-alias rewriting every import. An import it cannot see, such as a dynamic `import()`
  of a computed string, fails only at run time.

### Questions in create mode (2026-10-27)

> "Chốt chỉ hỏi package manager + xác nhận" (user, 2026-10-27)

| Question | Asked when | Default, and what `-y` takes |
|---|---|---|
| Package manager | `--pm` is not given | `npm` |
| Confirmation: the file list, then "write N files to my-app and install?" | always, unless `--dry-run` | yes; declining or Ctrl+C exits 1 |

Nothing else is asked: `--framework` defaults to `node` and `.vscode/` is controlled only by
`--no-vscode`.

### Files that already exist in an existing repository (2026-10-27)

> "Đồng ý phương án merge đối với những files dùng chung. Đối với những files cần xử lý, thêm flag
> --force|-f. Khi đó chia 2 trường hợp có f hoặc không f (mặc định không). Khi không thì exit 1 +
> warn msg." (user, 2026-10-27)

| Kind | Files | Already there |
|---|---|---|
| Shared: the user owns the content | `package.json`, `.gitignore`, `.husky/pre-commit`, `.husky/commit-msg` | Always merged: scripts, devDependencies and the `lint-staged` key added only when absent; missing `.gitignore` lines appended; the hook line added once, user lines kept |
| Owned by init: init writes the whole file | `eslint.config.mjs`, `.prettierrc.json`, `.editorconfig`, `commitlint.config.mjs`, `.vscode/settings.json`, `.vscode/extensions.json` | Without `-f`: exit 1, listing every such file. With `-f, --force`: replaced, marked `~` in the confirmation list |

Details the planner proposed on top, 2026-10-27, standing unless the user objects:

- The check runs in preflight, before any write, so a stop leaves the repository untouched; the
  shared-file merges do not run either.
- The message names the next step: "these files already exist: eslint.config.mjs, .vscode/settings.json;
  to replace them: jss-devtools init --force". When `.vscode/` is among them, it also offers
  `--no-vscode`.
- `--dry-run` follows the same rule: without `-f` it exits 1 with the same list; `--dry-run -f`
  shows the plan with `~`.
- `-f` with `init <dir>` exits 1, the way `--pm` does in the other mode: create mode needs an empty
  folder, so there is nothing to force.
- Help line: `-f, --force  replace config files init owns when they already exist (default: false:
  init stops and lists them)`.
- Accepted: `-f` replaces a file even when it has uncommitted changes. The flag is the user's choice.

Wording the planner settled at the phase 3 review, 2026-10-27, standing unless the user objects:

- `-f` with `init <dir>`: "-f, --force only applies when setting up an existing project; a new
  project has nothing to replace".
- Existing mode, detected manager not installed: "<pm> is not installed; install it". The create-mode
  tail "or pick another with --pm" is dropped, since `--pm` exits 1 in this mode.
- The `.vscode/` offer appended to the "already exist" message: "; or pass --no-vscode".
- A `package.json` key from the config-name table joins the same list as `package.json "prettier"
  key` (or `"commitlint"`).

#### Other names for the ESLint and Prettier configs (2026-10-27)

> "Chốt 12a theo phương án detected all file support của eslint và prettier theo docs, xong exit 1
> chung, có -f thì xử lý xoá, tóm lại cuối cùng chỉ target tới 2 files eslint.config.mjs,
> .prettierrc.json." (user, 2026-10-27)

Every config name the official docs list counts as "already there". They join the one exit 1 list
with the owned files; with `-f` they are deleted (marked `-` in the confirmation) and init writes
only `eslint.config.mjs` and `.prettierrc.json`. The names live in one table in the code, used both
to detect and to delete.

| Tool | Names that count, from the docs (read 2026-10-27) | With `-f` |
|---|---|---|
| ESLint | `eslint.config.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts` ([configuration files](https://eslint.org/docs/latest/use/configure/configuration-files), docs at v10.13.0) | the others deleted, `eslint.config.mjs` written |
| Prettier | `.prettierrc`, `.prettierrc.json`, `.yml`, `.yaml`, `.json5`, `.js`, `.ts`, `.mjs`, `.mts`, `.cjs`, `.cts`, `.toml`; `prettier.config.js`, `.ts`, `.mjs`, `.mts`, `.cjs`, `.cts` ([configuration](https://prettier.io/docs/configuration)) | the others deleted, `.prettierrc.json` written |
| Prettier | the `"prettier"` key in `package.json` | the key removed in the `package.json` merge. It has to go: Prettier reads it before any file, so `.prettierrc.json` would be ignored while it stays |

Commitlint gets the same rule: "Chốt 13a" (user, 2026-10-27).

| Tool | Names that count, from the docs (read 2026-10-27) | With `-f` |
|---|---|---|
| commitlint | `.commitlintrc`, `.commitlintrc.json`, `.yaml`, `.yml`, `.js`, `.cjs`, `.mjs`, `.ts`, `.cts`, `.mts`; `commitlint.config.js`, `.cjs`, `.mjs`, `.ts`, `.cts`, `.mts` ([configuration](https://commitlint.js.org/reference/configuration.html)) | the others deleted, `commitlint.config.mjs` written |
| commitlint | the `"commitlint"` key in `package.json` | the key removed in the `package.json` merge |

Not detected, stated as known limits:

- Legacy `.eslintrc*` files and the `eslintConfig` key. ESLint 10 no longer reads them ("Starting
  with ESLint v10.0.0, the old configuration format is no longer supported", migration guide), so
  they cannot fight `eslint.config.mjs`; they stay as dead files.
- The `"prettier"` and `"commitlint"` keys in `package.yaml`. Existing mode requires
  `package.json`, and a pnpm `package.yaml` next to it is not handled.
- Config files below the project root. ESLint 10 looks up from each linted file's folder, so an
  `eslint.config.js` in `src/legacy/` still applies there; init only checks the root.

### Dependency versions (open, evidence gathered 2026-10-27)

The reference (`jearax/npm/jss-devtools` 0.6.4, `src/commands/init/install/resolve-specs.ts`):

- Planned as "caret ranges resolve latest stable qua registry-client, không hard-pin" (its
  `plans/260830-2218-init-command-design/plan.md`, decision 9).
- At run time it fetches each package's registry metadata, resolves `eslint` first, then takes the
  newest stable version in the current major whose `peerDependencies` accept what was already
  chosen. Packages the user already declares are skipped. Installed with `<pm> add -D name@^x.y.z`,
  so the package manager writes `package.json`. Offline: `name@latest` and a warning.
- It still needed hand-kept caps: `ANCHOR_MAX_MAJOR` (`typescript` 5, `eslint` 10) and
  `MAJOR_LOCKSTEP` (`@eslint/js` follows `eslint`). Two fixes shipped after users hit install
  failures: `5323d4e` (2026-09-08, eslint capped for eslint-plugin-react, pnpm 11 build scripts) and
  `9bd8f46` (2026-10-12, "@eslint/js 10.0.0 declares no peers, so the peer-aware picker paired it
  with the capped eslint 9 and npm rejected the manifest with ERESOLVE").
- `prettier-package-json` no longer appears in its `src/`: generated `lint-staged` formats
  `./package.json` with `prettier --write`.

Registry on 2026-10-27: `typescript` latest is 7.0.2, while `@typescript-eslint/parser` 8.72.1 peers
`typescript >=4.8.4 <6.1.0`. A plain `@latest` install today would pair TypeScript 7 with a parser
that does not accept it.

Decided (2026-10-27):

> "tại thời điểm mình làm nè, ưu tiên lấy latest version hết rồi pinned lại, nếu không khớp thì giảm
> hay resolve sao cho ổn định tất cả rồi pinned lại" (user, 2026-10-27)

- Versions are chosen once, when the preset is written, not when a user runs `init`. Start from
  every package's latest; where the set does not fit, step a package down until the whole set
  installs and runs; pin that set in the CLI, in one table. Nothing is fetched to choose versions at
  run time.
- "Fits" means: every peer range holds, the set installs with each supported package manager, and a
  generated project passes `lint`, `typecheck`, `build` and `node dist/main.js`. That check becomes a
  test in this repository, so a version bump that breaks it fails CI before a release.
- A pinned version must be older than pnpm's `minimumReleaseAge` (default 1440 minutes, pnpm
  docs "Dependency resolution", read 2026-10-27), or a pnpm user's first install of the generated
  caret range refuses it. This repo needed `minimumReleaseAgeExclude` for `@commitlint/*` 21.2.4 for
  that reason; generated projects get no exclude list.
- First pass on 2026-10-27, peers only: everything at latest except `typescript`, stepped down from
  7.0.2 to 6.0.3 (newest 6.0.x) for `@typescript-eslint/*` 8.72.1. The full check is part of the
  plan.
- The generated `package.json` gets caret ranges of the pinned set, `"eslint": "^10.13.0"`: "Chốt
  15b, vì khi `semver` đúng nodejs ecosystem thì sẽ không có vụ hard pinned, và ^ vẫn luôn đúng."
  (user, 2026-10-27). The table in the CLI holds exact versions; only the written range is a caret.
- Checked against the one package whose caret could cross a peer bound: `^6.0.3` allows any 6.x,
  and `@typescript-eslint/*` accepts only `<6.1.0`. On 2026-10-27 the registry has no stable 6.x after
  6.0.3 (dist-tags: `latest` 7.0.2, `beta` 7.1.0-beta), so the caret resolves inside the bound.

#### `@types/node` follows `engines.node` (2026-10-27)

> "@types/node thì dễ mình tl luôn, tuỳ theo engines.node mà xử lý @types/node@version thôi" (user,
> 2026-10-27)

`@types/node` is the one package not taken at latest: its major is the major of the generated
`engines.node`, at the newest version in that major. Types ahead of the runtime would let `tsc`
accept APIs the target Node does not have. The floor the pinned tools impose on 2026-10-27 is
22.22.1 (`lint-staged` 17 `>=22.22.1`, `@commitlint/cli` `>=22.12.0`, `eslint` 10
`^20.19.0 || ^22.13.0 || >=24`).

#### `engines.node` of a new project (2026-10-27)

> "Phương án detect current version của user fallback về >= 24.11.0 thì sao? Nhưng chúng là 1, vì
> min user node cũng là 24.11.0" / "Chốt d" (user, 2026-10-27)

- A new project's `engines.node` is the CLI's own floor, `>=24.11.0`, read from this repository's
  `package.json` at build time the way `scripts/package-info.mjs` reads the other package facts. One
  number, one home. `@types/node` is therefore `^24.x`, newest 24 at pin time (24.19.2 on
  2026-10-27).
- Not detected from the running Node: the installer already refuses anything below 24.11.0, so a
  fallback would never run, and a detected value could only be higher, which would refuse teammates
  on Node 24 LTS and need a pinned `@types/node` for every possible major.
- Accepted: raising the CLI's floor raises every new project's floor with it.
- Invariant for the version table: the highest `engines.node` among the packages pinned for the
  `node` preset stays at or below this floor. The check joins the existing floor test.

#### The `packageManager` field (2026-10-27)

> "Chốt 17a" (user, 2026-10-27)

- The value is `<pm>@<version>`, the version taken from `<pm> --version` on the user's machine at
  run time. It records what the project was made with, so Corepack gives the team that version.
- Create mode runs `<pm> --version` in preflight. A failure, as with `--pm pnpm` and no pnpm on
  `PATH`, exits 1 with "pnpm is not installed; install it, or pick another with --pm" before the
  folder is created. The same call is the "is it installed" check.
- Existing mode: `package.json` is shared, so `packageManager` is added only when absent and never
  rewritten. The detected manager's `--version` runs in preflight too, since init installs with it.

### Two new roles in a command folder (2026-10-27)

Approved by the user on 2026-10-27, quoting the planner's lean back: "Ý này mình đồng ý `Lựa chọn
khác là đưa chúng lên core/constants/. Nhưng core dành cho thứ dùng chung, còn bảng version của
preset node chỉ init dùng. Mình nghiêng về duyệt hai loại mới này, kèm luật kiến trúc và fixture
test như 0024 yêu cầu.`"

| Suffix | Folder | Role |
|---|---|---|
| `.constant.ts` | `commands/<name>/constants/` | constants one command owns: the version table, the config-name table |
| `.template.ts` | `commands/<name>/templates/` | the content of one generated file |

### Later: `--harness` (2026-10-27, noted only)

> "FYI, sẽ có flag --harness trong tương lại, để init kèm với harness sẽ phát triển." (user,
> 2026-10-27)

Not part of the `node` preset plan. Recorded so the init structure leaves room for a second,
optional set of files on top of a preset.

### Where the preset's file contents come from (2026-10-27, provisional)

> "Tạm thời chốt 25a, notes lại cần review lại khi commit." (user, 2026-10-27)

- Source: this repository's `main`, minus what exists only because this repo ships a CLI: tsdown,
  vitest, `release/` in `.gitignore`, the `tests/fixtures` override, `minimumReleaseAgeExclude`, and
  the like. Not `checkpoint/init-reference` (`68f5e83`), which still has `NodeNext` and no import
  rules; not the reference 0.6.4 generators, which use the separate `@typescript-eslint/*` packages.
- `main` already matches the decisions above: `module: Preserve` / `moduleResolution: Bundler`,
  `import-x/internal-regex: '^@/'`, `no-restricted-imports` against `../*` and against `.js`/`.ts`
  extensions, and `lint-staged` running `prettier-package-json` before `prettier`.
- The preset holds a copy, in the CLI's source; later edits to this repo's configs do not flow into
  it on their own.
- `main` is a source of contents, not a target: "Cần clear rõ, init tạo ra cái gì, repo này có cái
  gì, không phải đồng nhất repo hiện có và bắt buộc init tạo ra phải có đâu. Chỉ focus những gì mà
  init sẽ quản lý như mọi Q đã quyết định thôi." (user, 2026-10-27). What init writes is the file
  list decided above, nothing more; a file this repo has and that list lacks is not a gap.
- **Provisional: the user reviews the generated contents again at commit time.** The plan lists every
  file with its source and what was removed, so that review has one table to check.
- Answers T5 in `open-questions.md`, provisionally.

### No manifest, and running init twice (2026-10-27)

> "Chốt bỏ manifest" (user, 2026-10-27)

- init records nothing about what it wrote: no command reads such a record. The reference removed
  its self-management commands too (`plans/261012-1249-remove-self-management-commands`).
- Running `init` again in a repository it already set up exits 1, because its owned files exist
  (see "Files that already exist"). `init -f` with a newer CLI rewrites them with the new content,
  which is how a repository picks up a newer preset.

### `tsconfig.json` in an existing repository (2026-10-27)

> "Chốt 22a" (user, 2026-10-27)

- The `node` preset is a TypeScript preset, so existing mode requires `./tsconfig.json`. Absent:
  exit 1 in preflight, "no tsconfig.json here; init sets up TypeScript projects. To create one:
  jss-devtools init <name>".
- Existing mode never writes or edits `tsconfig.json`; it only needs it to exist. This closes the
  open question of whether init manages `tsconfig.json` there.
- Existing-mode scripts follow: `prepare`, `typecheck`, `lint`, `format` are added when absent;
  `dev`, `build` and `start` belong to create mode only, with the alias.

### Order of a real run, and an install that fails (2026-10-27)

> "21a" (user, 2026-10-27)

```text
create:   make the folder -> git init -> write files -> <pm> install (prepare: husky installs hooks)
existing:                               write files -> <pm> install
```

`git init` comes before the install because `prepare: husky` needs `.git` (see "Git in an existing
repository").

The install is the only step that can fail after files are written; every other check is in
preflight. When it fails:

- Nothing is rolled back in either mode: the written files stay, and the `-f` deletions stay.
- Exit 1 with the next step: "install failed; the files are written. To finish: cd my-app && npm
  install" (no `cd` in existing mode). The hint is the install, never `init` again: in create mode
  the folder is no longer empty, so `init my-app` would refuse.
- The package manager's own output goes to stderr unfiltered: with only exit 0 and 1 (decision
  0023), it is the only diagnosis the user gets.
- The manual install is a complete recovery: `prepare: husky` installs the hooks on it.

### `prettier-package-json` (2026-10-27)

The user's first draft kept it ("Có dùng `prettier-package-json`"). New evidence since: the reference
dropped it in `00c5fb1` (2026-10-12): "Format package.json with prettier --write in lint-staged
instead of prettier-package-json --use-tabs, which ignores .editorconfig", with "BREAKING CHANGE:
generated projects no longer sort package.json keys". npm on 2026-10-27: 2.8.0, last modified
2022-12-23; it reads its own cosmiconfig options (`useTabs`, `tabWidth`), not `.editorconfig`.

Decided: "Chốt 20c" (user, 2026-10-27).

- `lint-staged` runs both on `./package.json`, in this order: `prettier-package-json --write`, then
  `prettier --write`. The first sorts the keys, the second rewrites the whitespace from
  `.editorconfig`, so `.editorconfig` stays the only whitespace source. Reversing the order would
  break that.
- init also sorts the `package.json` it writes, so a new project starts sorted. Refined by the
  planner on 2026-10-27: not bundled. `prettier-package-json` 2.8.0 depends on `glob`, `cosmiconfig`,
  `fs-extra`, `commander` 4 and five more; the project installs it anyway, so after a successful
  install init runs the project's own copy, then `prettier --write package.json`, through the
  package manager's local-bin command. An install failure leaves `package.json` unsorted.
- `prettier-package-json` joins the pinned devDependencies; it has no peers.
- Confirmed "2A" (user, 2026-10-27): it ships in every generated project; the CLI bundle does not
  carry it.

### Git in an existing repository (2026-10-27)

> "Chốt 18a" (user, 2026-10-27)

husky 9.1.7 `index.js` installs only where `.git` sits in the current folder:
`if (!f.existsSync('.git')) return \`.git can't be found\``. `bin.js` writes that string to stdout and
exits 0, so `prepare: husky` succeeds while no hook is installed. Init therefore checks it itself,
in preflight:

| Found | Exit 1 with |
|---|---|
| no git repository at all | "not a git repository; run git init first" |
| `.git` in a parent folder, not in this one | "the git root is ../..; run jss-devtools init there" |

- The check is "`.git` exists", file or folder, the same test husky uses, so a git worktree (where
  `.git` is a file) passes.
- The second row is the monorepo sub-package of the known limit above: it now stops with a reason
  instead of installing no hooks.

#### Another hook manager (2026-10-27)

> "Chốt 19a" (user, 2026-10-27)

husky runs `git config core.hooksPath .husky/_` and overwrites whatever was set, so a repository
using lefthook, simple-git-hooks or its own hooks folder would silently lose its hooks.

- Preflight reads `git config --get core.hooksPath`. Unset, `.husky/_` (husky 9) or `.husky` (older
  husky) passes. Anything else exits 1: "git hooks are managed by <value> (core.hooksPath); remove it
  with git config --unset core.hooksPath to use husky".
- `-f` does not bypass it: `-f` only means replacing the config files init owns.
- Known limit: hand-written hooks in `.git/hooks/` with no `core.hooksPath` are also bypassed once
  husky sets it. Not detected.

### Git in create mode (2026-10-27)

> "init từ đầu -> tạo git (git init - y, git branch -m main (quiet msg luôn, kiểu force mặc định á,
> nếu không có git CLI exit 1))." (user, 2026-10-27)

- `init <dir>` always makes the new folder a git repository on branch `main`, with no output and no
  question. Proposed as one command, `git init -q -b main` (git 2.28+), which sets `main` whatever
  `init.defaultBranch` says; the user's two-command form is the fallback if older git must work.
- No `git` on `PATH`: exit 1, checked in preflight so the folder is never half created.
- A new folder inside another git checkout still gets its own repository ("force mặc định").
- Husky needs this: it installs its hooks into `.git`, so create mode cannot have hooks without it.

### Husky hooks (2026-10-27)

> "Câu hỏi hooksky chạy gì quá dễ, trong logic của repo refs
> `/Users/tandm/Documents/jearax/npm/jss-devtools` có mà, scout đi." (user, 2026-10-27)

Taken from the reference (`src/commands/init/generators/husky-hooks-content.ts`, 0.6.4):

| Hook | Runs | Needs |
|---|---|---|
| `.husky/pre-commit` | `lint-staged`, through the package manager's local-bin command (`npx`, `pnpm exec`, `yarn`, `bunx`, from `package-manager-detector`'s `execute-local`) | `lint-staged` config: source globs get `eslint --fix` and `prettier --write`; `./package.json` gets `prettier --write` |
| `.husky/commit-msg` | `commitlint --edit "$1"`, same local-bin command | `commitlint.config.mjs` extending `@commitlint/config-conventional`; `@commitlint/cli` and `@commitlint/config-conventional` |

Each hook file is `#!/usr/bin/env sh` plus that one line. `prepare: husky` in the scripts activates
them on install. The reference also had hidden `--no-linter` and `--no-commitlint`; neither is
carried over, confirmed by the user on 2026-10-27.

### Template source and starter code (2026-10-27)

> "File mẫu, repo mẫu, repo boilerplate, template chỉ cần khi --framework là react|rn|next|nest, cái
> đống này là 1 thời gian sau tôi mới phát triển. Hiện tại node thì chỉ có các files config thôi, các
> file đó thì trong code, ví dụ src/assets/... hay gì đó." / "Đối với framework là node thì
> src/main.ts" (user, 2026-10-27)

- `node` has no template repository: every file's content lives in the CLI's own source and is
  bundled into `cli.mjs`. Templates and boilerplates wait for the other frameworks.
- The only source file a new `node` project gets is `src/main.ts`. It is what `tsc` compiles; without
  an input file `tsc` fails with TS18003.

### Files a new `node` project gets (2026-10-27)

> "Files nào không đủ bạn bổ sung thêm là được." (user, 2026-10-27)

The user's list, plus what the decisions above make necessary (marked *added*):

| File | Why |
|---|---|
| `package.json` *added* | name from `<dir>`, scripts, `lint-staged`, `packageManager`, `engines.node`, devDependencies; formatted with `prettier-package-json` |
| `tsconfig.json` *added* | `paths` `@/*` → `./src/*`, no `baseUrl`, `esnext` / `bundler` |
| `src/main.ts` *added* | the starter file, see above |
| `eslint.config.mjs` | user's list |
| `.prettierrc.json` | user's list; JS syntax rules only |
| `.editorconfig` | user's list; the single whitespace source, Prettier reads it |
| `.gitignore` | user's list; `node_modules/`, `dist/`, `.env*`, `*.log`, `.DS_Store` |
| `.husky/pre-commit`, `.husky/commit-msg` | user's list (`.husky/`); content above |
| `commitlint.config.mjs` *added* | required by `commit-msg` |
| `.vscode/settings.json`, `.vscode/extensions.json` | user's list; skipped with `--no-vscode` |
| `pnpm-workspace.yaml` *added*, pnpm only | `allowBuilds` for `unrs-resolver` (from `eslint-plugin-import-x`) and `esbuild` (from `tsx`) |

`esbuild: true` in `allowBuilds`, decided 2026-10-27: "Do dùng tsx, nên cho allowBuilds esbuild: true
đi, là xong cho case này." (user). Measured on pnpm 11.24.0 in a project created by `init --pm pnpm`:
without the entry, `pnpm install` exits 1 with `ERR_PNPM_IGNORED_BUILDS` for `esbuild@0.28.2`, and so
does every `pnpm exec` and `pnpm run` afterwards, because pnpm re-checks the dependencies before each
one. With `esbuild: true` the postinstall runs, and `pnpm exec tsx src/main.ts` works.

Existing mode with pnpm, decided 2026-10-27: `pnpm-workspace.yaml` becomes a shared file, merged
like `.gitignore`: created when absent, otherwise `allowBuilds.esbuild` and `allowBuilds.unrs-resolver`
are each added only when absent, and a value the user set is kept, `false` included. Existing mode
does not add `strictPeerDependencies` or `engineStrict`; create mode writes both. Asked whether
existing mode should add them, the user chose "Không thêm": with `strictPeerDependencies: true` a
project whose dependencies already disagree on peers would start failing to install. An earlier
reading of "OK, nhưng tôi thấy còn có quản lý 2 fields này" as a request to add them was the
planner's misreading; the user was asking, and this answer replaces it.

`.prettierignore` *added* on 2026-10-27, correcting an earlier "not needed": Prettier 3 skips what
`.gitignore` lists, but lockfiles are committed, and the `format` script copied from `main` runs
`prettier --write .`. Confirmed: "OK, có .prettierignore, nội dung nó làm sao cho align all config
là đc." (user, 2026-10-27). Its entries line up with the other ignore lists the preset writes: the
build and cache folders ignored by `.gitignore`, ESLint's `globalIgnores` and the `tsconfig.json`
excludes (`node_modules/`, `dist/`, `coverage/`), plus `.env*`, `.eslintcache`, `*.log`, and the four
lockfiles, which are committed and so not in `.gitignore`. Which of these `init` writes
into an existing repository, and what it does when one is already there, is the next topic.

## Flags in the first batch

> "Vậy tôi chốt làm trước các flag sau: -h|--help, --dry-run, -y|--yes, --json" (user, 2026-10-22)

| Flag | Contract | Status |
|---|---|---|
| `-h, --help` | Commander's usage and options, plus an `Examples` section added with `addHelpText('after')`: plain, `--dry-run`, `--yes` (CI). Exit 0. Banner only on a terminal, from the root's `beforeAll`. "a, có Examples" (user, 2026-10-22) | decided |
| `--dry-run` | Runs preflight (read-only): a failed check exits 1 as a real run would. Shows `+` new and `~` changed files, then "Dry run: N files would be written". Never asks, never writes: no file, no install, no hooks, no manifest; the flow branches off once, after the preview and before the confirmation. With `--yes` it still writes nothing and is not an error. Always exit 0 when the plan is shown, changes or not. A `--check`-style opt-in exit code waits for a real use case (UC4, P3). "a, luôn exit 0." (user, 2026-10-22); the behavior table was put with the question and drew no objection | decided |
| `-y, --yes` | Never asks any question; every question takes its default, for CI/CD. Each question's default is designed with that question, not here: `-y` does not mean "answer yes". Without `-y`: a terminal asks; no terminal on stdin or stdout, or `CI` set, exits 1 with "run it in a terminal, or pass --yes". Help line: `do not ask; take the default answers`. "Đối với tôi, -y nghĩa là không hỏi bất kỳ câu hỏi nào, lấy giá trị default, dùng để support CI/CD á" / "Không phải có -y thì các câu hỏi default là yes. -y là của chung toàn command, các giá trị default thì tuỳ vào cách mình gán cho hợp lý, thiết kế sau." (user, 2026-10-22). "Toàn command" was clarified as: declared once, attached by every command that asks; see below | decided |
| `--json` | Dropped, with everything tied to it: no JSON output, no `--help` example, no stream split. "Bỏ hết mọi thứ liên quan --json, vì usecase k thực tế." (user, 2026-10-22). Closes T4 | dropped |

### Help feedback after the scaffold shipped

> "Feedback của tôi về command init, các options cần thông tin thêm / rõ / chi tiết về default value
> nếu có." (user, 2026-10-22)

Every argument and option in `--help` states what it does, what happens without it, and its default
value. The wording is being agreed below; it lands as a follow-up to the shipped scaffold.

## Where the shared flags are declared

`-y, --yes` and `--dry-run` are declared once in `src/core/` as plain data (flags and description),
and every command that asks a question attaches them in its `*.command.ts`; `doctor` asks nothing and
has neither. Core holds no commander import, per the `commander-in-command-files-only` rule.
"Khai báo 1 lần, command nào cần thì gắn" (user, 2026-10-22, chosen option).

## Declining the confirmation (D4, part)

No, or Ctrl+C, at the confirmation exits 1 with "cancelled, nothing written" on stderr. "exit 1"
(user, 2026-10-22, chosen option).

Not in the first batch: `[dir]`, `--pm`, `--framework`, `--no-vscode` (P3, decided above). Dropped by the
user: `--no-install`, `--no-linter`, `--no-commitlint`, `--import-alias`. Not proposed again:
`--no-hooks`. Decided: `-f, --force`, see "Files that already exist". `--cwd` is dropped: "Chốt bỏ --cwd" (user,
2026-10-27). `init <dir>` names the folder in create mode, and existing mode runs where the user
`cd`s to.

## Package name in create mode

Decided 2026-10-27, after the code review found `init "My App"` writing `"name": "My App"`: the
folder keeps the name the user typed, and `package.json` gets a valid npm name derived from it,
without asking. "Xử lý ngầm behaivior được không, tên folder vẫn có thể là "My App" nhưng pkg name
là my-app" (user). The derivation: lowercase; every run of characters outside `a-z`, `0-9`, `-`,
`.`, `_` becomes one `-`; leading `.`, `_` and `-` and trailing `-` are trimmed; at most 214
characters. A folder name with nothing left after that (only non-Latin letters, for example) exits 1
before any write, naming the folder and asking for a name with Latin letters or digits.

## Windows

Decided 2026-10-28: native Windows is not supported and nothing is built for it; the limits are
written down. "Windows: chỉ notes lại, không xử lý." (user). WSL is Linux and works as tested. What
native Windows hits, found in the code review: the only installer is POSIX sh (the package is
private, so there is no npm install); `init` runs npm, pnpm and yarn through `execFile`, which the
Node docs say cannot launch their `.cmd` shims, so it reports "npm is not installed"; the `cd`
hints use POSIX quoting; and a generated project has no `.gitattributes`, so a Windows clone with
`core.autocrlf=true` gets CRLF files that Prettier's `lf` rejects.

## Help text casing

Decided 2026-10-28, after reading the init test matrix: every description in `--help` starts with
a capital letter. "In hoa chữ cái đầu lên trước." (user). Scope, chosen option "Toàn bộ help": the
command descriptions, the Arguments and Options descriptions, the explanations in Examples, for
every command, and commander's own texts (`-v, --version`, `-h, --help`, the `help` command), so the
two styles never mix. Runtime messages (errors, prompts, outros) keep their current casing.

## Package manager order

Decided 2026-10-28: "Thứ tự của pm luôn theo dãy sau, thống nhất, align hết, tương tự cho những case
cần chiều ngược lại nha: bun -> pnpm -> yarn -> npm" (user). Every list of the four managers uses
this order: the help values, the package manager question, the "supported: …" errors, the type and
constant declarations, the test loops and the docs. It is the same order as detection priority
(see "Detecting the package manager" above). The default stays npm ("Ý là default npm á", user):
`--yes` and `--dry-run` take npm, and the question preselects npm although it is listed last.

## Help option format and articles

Decided 2026-10-28. An option with a fixed list shows it as `(values: "a" | "b"; default: "x")`
instead of commander's `(choices: "a", "b", default: "x")`; the user proposed "values" for
"choices". `--pm` reads "Package manager for a new project" with `default: "npm"` ("Ý là default npm
á"); "asked if omitted" is dropped as redundant (user). Help text keeps its articles: "OK, giữ mạo từ
a/an/the" (user), the convention of git, gh, cargo and docker.

## Order of the init examples

Decided 2026-10-28: "Theo dạng ưu tiên usecase dùng nhiều nhất trước + ngắn trước / dài sau cho dễ
nhìn" (user), then "Okie, approve" on this order: `init my-app`, `init my-app --pm pnpm -y`, `init`,
`init -f`, `init --dry-run`. Create mode comes first because it is the main use case; within each
mode the shorter command comes first; `--dry-run` applies to both modes and closes the list.

## Tool names in messages

Decided 2026-10-28: a tool is written the way its own project writes it: ESLint, Prettier,
commitlint (lower case even at the start of a sentence, as its README does). "OK, giữ như cũ cho
case này." (user)

## Colours in the init output

Decided 2026-10-28 after a coloured mockup: "OKie, đẹp á, tôi approve" (user). The aim, in the user's
words: "tôi muốn 1 UIs có màu mè để dễ nhìn 1 tí, không phải 100% như git diff". So no content diff.

- Plan marks: `+` green, `~` yellow, `-` red; the folder part of a path dim.
- A heading above the list: `<project>: 13 to create`, or `9 to create, 2 to update, 1 to delete`,
  each count in its mark's colour, zero counts left out. It replaces the dry-run outro's file count.
- Install in a terminal: clack `taskLog`, the last 5 lines live and dim, cleared on success into
  `Installed with <pm> (13.1s)`, the whole log kept on failure (`retainLog`).
- `Sorted package.json` as its own step.
- Outside a terminal (pipe, CI): "In đầy đủ log" (user): the step lines and the package manager's
  whole output as it arrives. No colour, and no cursor codes, which clack `taskLog` 1.8.1 writes
  even when piped (probed 2026-10-28), so it is not used there. Icons stay: "tôi nghĩ có icon/emoij
  tương ứng như check / error / warning" (user); they are plain characters, the same clack symbols
  as in a terminal.

## Long flag first

Decided 2026-10-28: "Options/flags có alias, strategy là dùng flag dài trước / flag alias ngắn sau
cho thống nhất" (user), example `--help, -h`. Every flag with a short alias is declared and written
long first: `--force, -f`, `--yes, -y`, `--help, -h`, `--version, -v`, in the help, in messages and
in the docs. Commander 15 parses both forms from a long-first declaration (probed 2026-10-28).

## Default last

Decided 2026-10-28: "Tất cả các cú pháp `default` thống nhất thành 1 format, để sau cùng" (user),
with the example `(init stops and lists them; default: off)`. In every help line the parenthesis
holds the notes first, then `values: …`, then `default: …` last, separated by `; `.
Quotes: a value the user can type is quoted (`default: "npm"`, `values: "bun" | …`); a state is not
(`default: off`, `default: written`). "Approve đề xuất của bạn." (user)

## Order of the plan list

Decided 2026-10-28: "Theo strategy: folder trước, file sau, sắp xếp theo alphabet" (user), with a
screenshot of the VS Code explorer as the reference. The plan list sorts by path the way that
explorer does: at each level, entries inside a folder come before files; names compare
alphabetically, case-insensitive, numbers by value, a leading dot before letters. Every entry sorts
by its path whatever its mark (`+`, `~`, `-`). Only the display changes; the write order does not.

## Commands to run next

Decided 2026-10-28, from three mockups (box, numbered, shell prompt): "Thống nhất các case tương tự
cho project này là dùng style $." (user). Commands the user should run next are listed one per line
under a heading, each prefixed with a dim `$ `, the command itself in cyan, as the help Examples
already do:

    └  Next steps
         $ cd my-app
         $ pnpm run dev
Scope, chosen option "Outro + lỗi sau khi đã ghi file": the init outro and the two errors raised after
files are written (install failed, package.json sort failed) list their commands this way. Preflight
errors and doctor hints with a single command stay on one line.
Existing mode ends with `Next steps` and `$ <pm> run format`, chosen option "Next steps: format":
existing code rarely matches the new Prettier config (probed 2026-10-28: `bun run lint` exits 1
right after init, 0 after `bun run format`).

## Import paths in VS Code

Decided 2026-10-28. The user found `no-restricted-imports` "quá cứng" and asked whether
`"js/ts.preferences.importModuleSpecifier": "non-relative"` should replace it or join it. Planner's
proposal, to keep both, so auto-import writes the `@/` form the rule demands and the rule still
holds for other editors, hand-written imports, agents and CI; with
`"js/ts.preferences.importModuleSpecifierEnding": "minimal"` for the no-extension half of the rule.
User: "OK, chọn cả 2" for both the repository's `.vscode/settings.json` and the one init writes. The
rule stays as it is. The setting names exist in VS Code 1.142 (checked in its bundled
typescript-language-features manifest); the `js/ts.*` prefix dates from VS Code 1.110.

## Dry-run outro

Decided 2026-10-28: "2. Approve." (user), on the planner's proposal. The dry run keeps
`Dry run: nothing written` and lists the command that applies the plan, in the `$` style of
"Commands to run next": the words the user typed, without `--dry-run`, after `To apply:`.

    └  Dry run: nothing written
       To apply:
         $ jss-devtools init my-app --pm pnpm

## Legacy ESLint config (matrix issue #4)

Decided 2026-10-28, option "Như các tên khác" (user), replacing the known limit recorded under
"Other names for the ESLint and Prettier configs": legacy ESLint config names count as other names
of the ESLint config. Without `-f` they join the exit 1 list; with `-f` the files are deleted and the
`eslintConfig` key leaves `package.json`. The names, from `configFilenames` in
`@eslint/eslintrc` `lib/config-array-factory.js` (main, read 2026-10-28) and the v8 configuration
files page: `.eslintrc.js`, `.eslintrc.cjs`, `.eslintrc.yaml`, `.eslintrc.yml`, `.eslintrc.json`,
`.eslintrc`, and the `eslintConfig` key in `package.json`.

## Error output (exit 1)

Decided 2026-10-28: "Tôi nghĩ cũng cần format lại những chỗ output lỗi, tức là exit 1 á. Nên giống chỗ
`To apply:` nhỉ?" then "Approve hết, nhưng những chỗ `<việc cần làm>` -> `<Việc cần làm>`" (user), on
the planner's proposal. It replaces the scope note under "Commands to run next" that kept
single-command preflight errors on one line. Every exit 1 message has up to three parts:

1. The first line, red: what is wrong, short, no action in it.
2. When the fix is a command: `To <purpose>:` and the `$` lines, the same helper as `To apply:` and
   `To finish:`.
3. When the fix is not a command: one `↳ <Action>` hint line, yellow, starting with a capital
   letter. Doctor's hints use the same line and get the same capital.
4. With no fix to offer: the first line only.

The wording of every error row in
[the message review](../reports/planner-261028-1136-init-message-rewrites.md) is approved with it,
in the form listed in [the task](../reports/planner-261028-2338-error-output-format-task.md).

## Capital first line, placeholder and cancel key

Decided 2026-10-29: "Duyệt viết hoa dòng lỗi như bạn đề xuất, sử dụng <project-name>" and "`↑/↓ to
navigate • Enter: confirm`, tôi nghĩ nên thêm esc|ctrl+c" (user).

- The first line of every error starts with a capital letter. When it would start with a file, a
  flag, a command or a value the user typed, the sentence is rewritten so that word is not first
  (`Invalid JSON in package.json: …`, not `package.json is not valid JSON`). Commander's own errors
  get the capital too; their words stay. The rewritten lines are listed in
  [the task](../reports/planner-261029-0020-capital-errors-and-cancel-key-task.md).
- The placeholder in a suggested command is `<project-name>`, replacing `<name>`.
- The package manager question's footer adds `Esc/Ctrl+C: cancel`. Clack 1.8.1 maps Esc to cancel
  (`["escape", "cancel"]` in the bundle) and reads the footer from its exported
  `SELECT_INSTRUCTIONS` array at render time.

## lint-staged without repeated work

Decided 2026-10-29: "strategy là `bỏ prettier --write thừa` (tức là tôi đã test với flow của git
commit + husky trước đó, sao cho hạn hết duplicate command)" (user). Each staged file goes through
each tool at most once and the commit output lists as few commands as the file types need: no
`prettier --write` after `eslint --fix` (the `prettier/prettier` rule already formats), and the other
globs merged or trimmed where a real commit shows it is safe. Same change in this repository's
`package.json` and in the `LINT_STAGED` that init writes.

## The two questions

Decided 2026-10-29 (user): "Chỗ `Which package manager? và Write 14 files to p1 and install?` theo ý
bạn đề xuất" and "Options thì sort ngược lại: npm -> yarn -> pnpm -> bun".

- The questions start with a capital letter and read as questions: `Which package manager?` and
  `Write <n> files to <project> and install?`.
- The package manager question lists npm, yarn, pnpm, bun: the reverse of the order fixed under
  "Package manager order", which allows the reverse "cho những case cần chiều ngược lại". npm stays
  preselected, now first. Help values, error lists and detection keep bun, pnpm, yarn, npm.
- Counting deletions apart in the confirm (message review row P2) is not decided by this.

## Confirm counts deletions apart (message review row P2)

Decided 2026-10-29: "`Write 11 files; delete 2 in p2 and install?`, có xử lý số ít số nhiều"
(user). With deletions the confirm reads `Write <w> files; delete <d> in <project> and install?`,
where `<w>` counts created and updated files and `<d>` deleted ones; `1 file` for one. Without
deletions it stays `Write <n> files to <project> and install?`.

Delete-only plans and the plan heading, decided 2026-10-29 (user):

- When nothing is written and only deletions remain (a set-up project where `init -f` finds a
  leftover config), the confirm drops the write part: `Delete <d> files in <project> and
  install?`, `1 file` for one. Option "Bỏ phần Write".
- The plan heading starts with a capital without changing the project name, which the user typed:
  `Changes in <project>: <counts>`, option "Changes in <project>: …", with the counts separated by
  `;` as in the confirm: "Chỗ này tôi mong muốn dùng format ; luôn `Changes in p2: 10 to create, 1
  to update, 2 to delete`" (user), so `Changes in p2: 10 to create; 1 to update; 2 to delete`.
