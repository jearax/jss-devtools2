import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { localBinCommandLine } from '@/core/adapters/package-manager.adapter';
import { PACKAGE } from '@/core/constants/package.constant';

import { CONFIG_NAMES } from './constants/config-name.constant';
import { mergeHook, mergeLines, mergePackageJson } from './merge.service';
import { commitlintConfigMjsTemplate } from './templates/commitlint-config-mjs.template';
import { editorconfigTemplate } from './templates/editorconfig.template';
import { eslintConfigMjsTemplate } from './templates/eslint-config-mjs.template';
import { gitignoreTemplate } from './templates/gitignore.template';
import { huskyCommitMsgTemplate } from './templates/husky-commit-msg.template';
import { huskyPreCommitTemplate } from './templates/husky-pre-commit.template';
import { packageJsonTemplate } from './templates/package-json.template';
import { pnpmWorkspaceYamlTemplate } from './templates/pnpm-workspace-yaml.template';
import { prettierignoreTemplate } from './templates/prettierignore.template';
import { prettierrcJsonTemplate } from './templates/prettierrc-json.template';
import { srcMainTemplate } from './templates/src-main.template';
import { tsconfigJsonTemplate } from './templates/tsconfig-json.template';
import { vscodeExtensionsJsonTemplate } from './templates/vscode-extensions-json.template';
import { vscodeSettingsJsonTemplate } from './templates/vscode-settings-json.template';

import type { PackageManagerName } from './templates/package-json.template';
import type { InitOptions } from './types/init-options.type';
import type { InitPlan, InitPreflight, PlanEntry } from './types/init-plan.type';

const hookCommands = (pm: PackageManagerName): { preCommit: string; commitMsg: string } => {
	return {
		preCommit: localBinCommandLine(pm, 'lint-staged', []),
		commitMsg: localBinCommandLine(pm, 'commitlint', ['--edit', '"$1"'])
	};
};

const createModeEntries = (preflight: InitPreflight, options: InitOptions): readonly PlanEntry[] => {
	const { pm, projectName, pmVersion } = preflight;
	const commands = hookCommands(pm);

	const at = (path: string, content: string): PlanEntry => {
		return {
			action: 'create',
			path,
			content
		};
	};

	const entries = [
		at(
			'package.json',
			packageJsonTemplate({
				projectName,
				packageManager: pm,
				packageManagerVersion: pmVersion,
				nodeFloor: PACKAGE.nodeFloor
			})
		),
		at('tsconfig.json', tsconfigJsonTemplate()),
		at('src/main.ts', srcMainTemplate({ projectName })),
		at('eslint.config.mjs', eslintConfigMjsTemplate()),
		at('.prettierrc.json', prettierrcJsonTemplate()),
		at('.editorconfig', editorconfigTemplate()),
		at('.gitignore', gitignoreTemplate()),
		at('.prettierignore', prettierignoreTemplate()),
		at('commitlint.config.mjs', commitlintConfigMjsTemplate()),
		at('.husky/pre-commit', huskyPreCommitTemplate({ command: commands.preCommit })),
		at('.husky/commit-msg', huskyCommitMsgTemplate({ command: commands.commitMsg }))
	];

	if (options.vscode !== false) {
		entries.push(
			at('.vscode/settings.json', vscodeSettingsJsonTemplate({ packageManager: pm })),
			at('.vscode/extensions.json', vscodeExtensionsJsonTemplate())
		);
	}

	if (pm === 'pnpm') {
		entries.push(at('pnpm-workspace.yaml', pnpmWorkspaceYamlTemplate()));
	}

	return entries;
};

const readIfExists = (dir: string, name: string): string | null => {
	const full = join(dir, name);

	return existsSync(full) ? readFileSync(full, 'utf8') : null;
};

const OWNED_TARGETS = new Set<string>(['eslint.config.mjs', '.prettierrc.json', 'commitlint.config.mjs']);

const existingModeEntries = (preflight: InitPreflight, options: InitOptions): readonly PlanEntry[] => {
	const { targetDir, pm, pmVersion, packageJson } = preflight;
	const force = options.force === true;
	const commands = hookCommands(pm);
	const entries: PlanEntry[] = [];

	if (packageJson === undefined) {
		throw new Error('existing mode needs the package.json read in preflight');
	}

	const merged = mergePackageJson(packageJson.parsed, {
		pm,
		pmVersion,
		force
	});

	if (merged !== null) {
		entries.push({
			action: 'update',
			path: 'package.json',
			content: merged
		});
	}

	const addShared = (path: string, fresh: string, command: string | null): void => {
		const raw = readIfExists(targetDir, path);

		if (raw === null) {
			entries.push({
				action: 'create',
				path,
				content: fresh
			});

			return;
		}

		const content = command === null ? mergeLines(raw, fresh) : mergeHook(raw, command);

		if (content !== null) {
			entries.push({
				action: 'update',
				path,
				content
			});
		}
	};

	addShared('.gitignore', gitignoreTemplate(), null);
	addShared('.prettierignore', prettierignoreTemplate(), null);
	addShared('.husky/pre-commit', huskyPreCommitTemplate({ command: commands.preCommit }), commands.preCommit);
	addShared('.husky/commit-msg', huskyCommitMsgTemplate({ command: commands.commitMsg }), commands.commitMsg);

	const owned: readonly (readonly [string, string])[] = [
		['eslint.config.mjs', eslintConfigMjsTemplate()],
		['.prettierrc.json', prettierrcJsonTemplate()],
		['.editorconfig', editorconfigTemplate()],
		['commitlint.config.mjs', commitlintConfigMjsTemplate()],
		...(options.vscode === false
			? []
			: ([
					['.vscode/settings.json', vscodeSettingsJsonTemplate({ packageManager: pm })],
					['.vscode/extensions.json', vscodeExtensionsJsonTemplate()]
				] as const))
	];

	for (const [path, fresh] of owned) {
		const raw = readIfExists(targetDir, path);

		if (raw === null) {
			entries.push({
				action: 'create',
				path,
				content: fresh
			});
		} else if (raw !== fresh) {
			entries.push({
				action: 'update',
				path,
				content: fresh
			});
		}
	}

	if (force) {
		for (const tool of ['eslint', 'prettier', 'commitlint'] as const) {
			for (const name of CONFIG_NAMES[tool].files) {
				if (OWNED_TARGETS.has(name)) {
					continue;
				}

				if (existsSync(join(targetDir, name))) {
					entries.push({
						action: 'delete',
						path: name
					});
				}
			}
		}
	}

	return entries;
};

export const buildInitPlan = (preflight: InitPreflight, options: InitOptions): InitPlan => {
	return {
		mode: preflight.mode,
		targetDir: preflight.targetDir,
		entries:
			preflight.mode === 'create' ? createModeEntries(preflight, options) : existingModeEntries(preflight, options)
	};
};

const PLAN_MARKS = {
	create: '+',
	update: '~',
	delete: '-'
} as const;

export const renderPlan = (plan: InitPlan): string => {
	return plan.entries
		.map((entry) => {
			return `${PLAN_MARKS[entry.action]} ${entry.path}`;
		})
		.join('\n');
};
