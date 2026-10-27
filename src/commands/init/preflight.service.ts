import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

import { gitHooksPath, gitTopLevel, gitVersion } from '@/core/adapters/git.adapter';
import { detectPackageManager, packageManagerVersion } from '@/core/adapters/package-manager.adapter';
import { CliError } from '@/core/errors/cli.error';

import { CONFIG_NAMES } from './constants/config-name.constant';

import type { PackageManagerName } from './templates/package-json.template';
import type { InitOptions } from './types/init-options.type';
import type { InitPreflight } from './types/init-plan.type';

const SUPPORTED_AGENTS = new Set<string>(['npm', 'pnpm', 'bun', 'yarn']);
const HUSKY_HOOKS_PATHS = new Set<string>(['.husky/_', '.husky']);

const notEmptyError = (dirArg: string): CliError => {
	return new CliError(`${dirArg} is not empty; to set up the project in it: cd ${dirArg} && jss-devtools init`);
};

const ensureEmptyTarget = (dirArg: string): string => {
	const target = resolve(dirArg);

	if (!existsSync(target)) {
		return target;
	}

	if (!statSync(target).isDirectory() || readdirSync(target).length > 0) {
		throw notEmptyError(dirArg);
	}

	return target;
};

const ensureGitInstalled = async (): Promise<void> => {
	const git = await gitVersion();

	if (git.status !== 'ok') {
		throw new CliError(git.problem);
	}
};

const installedVersion = async (pm: PackageManagerName, cwd: string, create: boolean): Promise<string> => {
	const version = await packageManagerVersion(pm, cwd);

	if (version === null) {
		throw new CliError(
			create ? `${pm} is not installed; install it, or pick another with --pm` : `${pm} is not installed; install it`
		);
	}

	return version;
};

const preflightCreate = async (dirArg: string, options: InitOptions): Promise<InitPreflight> => {
	const targetDir = ensureEmptyTarget(dirArg);

	await ensureGitInstalled();

	const pm = options.pm ?? 'npm';
	const pmVersion = await installedVersion(pm, process.cwd(), true);

	return {
		mode: 'create',
		targetDir,
		projectName: basename(targetDir),
		pm,
		pmVersion
	};
};

const parsePackageJson = (cwd: string): Record<string, unknown> => {
	if (!existsSync(join(cwd, 'package.json'))) {
		throw new CliError('no package.json here; to create a project: jss-devtools init <name>');
	}

	const raw = readFileSync(join(cwd, 'package.json'), 'utf8');

	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch (error) {
		throw new CliError((error as Error).message);
	}
};

const ownedConflicts = (cwd: string, withVscode: boolean): readonly string[] => {
	const names = [
		...CONFIG_NAMES.eslint.files,
		...CONFIG_NAMES.prettier.files,
		...CONFIG_NAMES.commitlint.files,
		'.editorconfig',
		...(withVscode ? ['.vscode/settings.json', '.vscode/extensions.json'] : [])
	];

	return [...new Set(names)].filter((name) => {
		return existsSync(join(cwd, name));
	});
};

const preflightExisting = async (cwd: string, options: InitOptions): Promise<InitPreflight> => {
	const parsed = parsePackageJson(cwd);

	if ('workspaces' in parsed || existsSync(join(cwd, 'pnpm-workspace.yaml'))) {
		throw new CliError('monorepos are not supported yet');
	}

	if (!existsSync(join(cwd, 'tsconfig.json'))) {
		throw new CliError(
			'no tsconfig.json here; init sets up TypeScript projects. To create one: jss-devtools init <name>'
		);
	}

	if (!existsSync(join(cwd, '.git'))) {
		const top = await gitTopLevel(cwd);

		if (top === null) {
			throw new CliError('not a git repository; run git init first');
		}

		// git prints the resolved path; cwd can sit behind a symlink, so compare resolved paths.
		throw new CliError(`the git root is ${relative(realpathSync(cwd), top)}; run jss-devtools init there`);
	}

	const hooksPath = await gitHooksPath(cwd);

	if (hooksPath !== null && !HUSKY_HOOKS_PATHS.has(hooksPath)) {
		throw new CliError(
			`git hooks are managed by ${hooksPath} (core.hooksPath); remove it with git config --unset core.hooksPath to use husky`
		);
	}

	const detected = await detectPackageManager(cwd);

	if (detected !== null && !SUPPORTED_AGENTS.has(detected.agent)) {
		throw new CliError(`${detected.agent} is not supported; supported: npm, yarn 1, pnpm, bun`);
	}

	const pm = (detected === null ? 'npm' : detected.name) as PackageManagerName;
	const pmVersion = await installedVersion(pm, cwd, false);

	const fileConflicts = ownedConflicts(cwd, options.noVscode !== true);

	const keyConflicts = (['prettier', 'commitlint'] as const).flatMap((tool) => {
		return CONFIG_NAMES[tool].packageJsonKeys
			.filter((key) => {
				return parsed[key] !== undefined;
			})
			.map((key) => {
				return `package.json "${key}" key`;
			});
	});

	const conflicts = [...fileConflicts, ...keyConflicts];

	if (conflicts.length > 0 && options.force !== true) {
		const withVscode = conflicts.some((name) => {
			return name.startsWith('.vscode/');
		});

		throw new CliError(
			`these files already exist: ${conflicts.join(', ')}; to replace them: jss-devtools init --force${withVscode ? '; or pass --no-vscode' : ''}`
		);
	}

	const preflight: InitPreflight = {
		mode: 'existing',
		targetDir: cwd,
		projectName: basename(cwd),
		pm,
		pmVersion,
		packageJson: { parsed }
	};

	return preflight;
};

export const preflightInit = async (
	cwd: string,
	positional: readonly string[],
	options: InitOptions
): Promise<InitPreflight> => {
	const dir = positional[0];

	return dir === undefined ? preflightExisting(cwd, options) : preflightCreate(dir, options);
};
