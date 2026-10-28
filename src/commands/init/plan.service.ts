import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { styleText } from 'node:util';

import { localBinCommandLine } from '@/core/adapters/package-manager.adapter';
import { PACKAGE } from '@/core/constants/package.constant';
import { CliError } from '@/core/errors/cli.error';

import { CONFIG_NAMES } from './constants/config-name.constant';
import { mergeHook, mergeLines, mergePackageJson, mergePnpmWorkspaceYaml } from './merge.service';
import { commitlintConfigMjsTemplate } from './templates/commitlint-config-mjs.template';
import { editorconfigTemplate } from './templates/editorconfig.template';
import { eslintConfigMjsTemplate } from './templates/eslint-config-mjs.template';
import { gitignoreTemplate } from './templates/gitignore.template';
import { huskyCommitMsgTemplate } from './templates/husky-commit-msg.template';
import { huskyPreCommitTemplate } from './templates/husky-pre-commit.template';
import { packageJsonTemplate } from './templates/package-json.template';
import { pnpmWorkspaceYamlExistingTemplate, pnpmWorkspaceYamlTemplate } from './templates/pnpm-workspace-yaml.template';
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

export const derivePackageName = (folder: string): string => {
	const name = folder
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/^[._-]+/, '')
		.replace(/-+$/, '')
		.slice(0, 214)
		.replace(/-+$/, '');

	if (name === '') {
		throw new CliError(`${folder} cannot be a package name`, {
			hint: 'Use a folder name with Latin letters or digits'
		});
	}

	return name;
};

const createModeEntries = (preflight: InitPreflight, options: InitOptions): readonly PlanEntry[] => {
	const { pm, projectName, pmVersion } = preflight;
	const packageName = derivePackageName(projectName);
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
				projectName: packageName,
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

	if (pm === 'pnpm') {
		const raw = readIfExists(targetDir, 'pnpm-workspace.yaml');

		if (raw === null) {
			entries.push({
				action: 'create',
				path: 'pnpm-workspace.yaml',
				content: pnpmWorkspaceYamlExistingTemplate()
			});
		} else {
			const merged = mergePnpmWorkspaceYaml(raw);

			if (merged.action === 'merged') {
				entries.push({
					action: 'update',
					path: 'pnpm-workspace.yaml',
					content: merged.content
				});
			}
		}
	}

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

const PLAN_MARK_COLOURS = {
	create: 'green',
	update: 'yellow',
	delete: 'red'
} as const;

const PLAN_COUNT_LABELS = {
	create: 'to create',
	update: 'to update',
	delete: 'to delete'
} as const;

const renderPath = (path: string): string => {
	const slash = path.lastIndexOf('/');

	return slash === -1 ? path : `${styleText('dim', path.slice(0, slash + 1))}${path.slice(slash + 1)}`;
};

const planPathCollator = new Intl.Collator('en', {
	numeric: true,
	sensitivity: 'base'
});

export const comparePlanPaths = (a: string, b: string): number => {
	const aSegments = a.split('/');
	const bSegments = b.split('/');

	for (let i = 0; i < Math.min(aSegments.length, bSegments.length); i++) {
		const aSegment = aSegments[i];
		const bSegment = bSegments[i];

		if (aSegment === undefined || bSegment === undefined || aSegment === bSegment) {
			continue;
		}

		const aIsFolder = i + 1 < aSegments.length;
		const bIsFolder = i + 1 < bSegments.length;

		if (aIsFolder !== bIsFolder) {
			return aIsFolder ? -1 : 1;
		}

		return planPathCollator.compare(aSegment, bSegment);
	}

	return aSegments.length - bSegments.length;
};

export const renderPlan = (plan: InitPlan): string => {
	return [...plan.entries]
		.sort((a, b) => {
			return comparePlanPaths(a.path, b.path);
		})
		.map((entry) => {
			const mark = styleText(PLAN_MARK_COLOURS[entry.action], PLAN_MARKS[entry.action]);

			return `${mark} ${renderPath(entry.path)}`;
		})
		.join('\n');
};

export const renderPlanHeading = (plan: InitPlan, projectName: string): string => {
	const counts = (['create', 'update', 'delete'] as const).flatMap((action) => {
		const count = plan.entries.filter((entry) => {
			return entry.action === action;
		}).length;

		return count === 0 ? [] : [styleText(PLAN_MARK_COLOURS[action], `${count} ${PLAN_COUNT_LABELS[action]}`)];
	});

	return counts.length === 0 ? projectName : `${projectName}: ${counts.join(', ')}`;
};
