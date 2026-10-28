import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

import { gitHooksPath, gitTopLevel, gitVersion } from '@/core/adapters/git.adapter';
import { detectPackageManager, packageManagerVersion } from '@/core/adapters/package-manager.adapter';
import { CliError } from '@/core/errors/cli.error';

import { CONFIG_NAMES } from './constants/config-name.constant';
import { mergePnpmWorkspaceYaml } from './merge.service';
import { shellQuote } from './shell-quote.service';
import { PACKAGE_MANAGERS } from './templates/package-json.template';

import type { PackageManagerName } from './templates/package-json.template';
import type { InitOptions } from './types/init-options.type';
import type { InitPreflight } from './types/init-plan.type';

const SUPPORTED_AGENTS = new Set<string>(PACKAGE_MANAGERS);

const SUPPORTED_LIST = PACKAGE_MANAGERS.map((pm) => {
	return pm === 'yarn' ? 'yarn 1' : pm;
}).join(', ');

const HUSKY_HOOKS_PATHS = new Set<string>(['.husky/_', '.husky']);

const notEmptyError = (dirArg: string): CliError => {
	return new CliError(`${dirArg} is not empty`, {
		label: 'To set it up instead',
		commands: [`cd ${shellQuote(dirArg)}`, 'jss-devtools init']
	});
};

const ensureEmptyTarget = (dirArg: string): string => {
	const target = resolve(dirArg);

	if (!existsSync(target)) {
		return target;
	}

	if (statSync(target).isFile()) {
		throw new CliError(`${dirArg} is a file`, {
			hint: 'Pick another name'
		});
	}

	if (!statSync(target).isDirectory() || readdirSync(target).length > 0) {
		throw notEmptyError(dirArg);
	}

	return target;
};

const ensureGitInstalled = async (): Promise<void> => {
	const git = await gitVersion();

	if (git.status !== 'ok') {
		const hint = git.status === 'missing' ? 'Install git, then rerun' : undefined;

		throw new CliError(git.problem, hint === undefined ? {} : { hint });
	}
};

const installedVersion = async (pm: PackageManagerName, cwd: string, create: boolean): Promise<string> => {
	const version = await packageManagerVersion(pm, cwd);

	if (version === null) {
		throw create
			? new CliError(`${pm} is not installed`, {
					hint: 'Install it, or pick another with --pm'
				})
			: new CliError(`this project uses ${pm}, which is not installed`, {
					hint: `Install ${pm}, then rerun`
				});
	}

	return version;
};

const preflightCreate = async (dirArg: string, options: InitOptions): Promise<InitPreflight> => {
	const targetDir = ensureEmptyTarget(dirArg);

	await ensureGitInstalled();

	const pm = options.pm ?? 'npm';
	const pmVersion = await installedVersion(pm, process.cwd(), true);

	// yarn 2+ defaults to Plug n Play, outside the yarn 1 scope this preset is tested against.
	if (pm === 'yarn' && Number.parseInt(pmVersion, 10) >= 2) {
		throw new CliError(`yarn ${pmVersion} is not supported, only yarn 1`, {
			hint: 'Pick another with --pm'
		});
	}

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
		throw new CliError('no package.json here', {
			label: 'To create a project',
			commands: ['jss-devtools init <name>']
		});
	}

	const raw = readFileSync(join(cwd, 'package.json'), 'utf8');

	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch (error) {
		throw new CliError(`package.json is not valid JSON: ${(error as Error).message}`, {
			hint: 'Fix it, then rerun'
		});
	}
};

// pnpm 11 writes this file for a single package too (allowBuilds placeholders), so only a top-level
// packages field says monorepo.
const isMonorepoWorkspace = (cwd: string): boolean => {
	const path = join(cwd, 'pnpm-workspace.yaml');

	return existsSync(path) && /^packages:/m.test(readFileSync(path, 'utf8'));
};

const ensurePnpmWorkspaceMergeable = (cwd: string): void => {
	const raw = readFileSync(join(cwd, 'pnpm-workspace.yaml'), 'utf8');

	if (mergePnpmWorkspaceYaml(raw).action === 'unmergeable') {
		throw new CliError('pnpm-workspace.yaml cannot be extended line by line', {
			hint: 'Add esbuild: true and unrs-resolver: true under allowBuilds, then rerun'
		});
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

	if ('workspaces' in parsed || isMonorepoWorkspace(cwd)) {
		throw new CliError('monorepos are not supported yet');
	}

	if (!existsSync(join(cwd, 'tsconfig.json'))) {
		throw new CliError('no tsconfig.json here', {
			label: 'To create a new project instead',
			commands: ['jss-devtools init <name>']
		});
	}

	if (!existsSync(join(cwd, '.git'))) {
		const top = await gitTopLevel(cwd);

		if (top === null) {
			throw new CliError('not a git repository', {
				label: 'To set one up',
				commands: ['git init']
			});
		}

		// git prints the resolved path; cwd can sit behind a symlink, so compare resolved paths.
		throw new CliError('this is not the git root', {
			label: 'To run it there',
			commands: [`cd ${shellQuote(relative(realpathSync(cwd), top))}`, 'jss-devtools init']
		});
	}

	const hooksPath = await gitHooksPath(cwd);

	if (hooksPath !== null && !HUSKY_HOOKS_PATHS.has(hooksPath)) {
		throw new CliError(`git hooks are managed by ${hooksPath} (core.hooksPath)`, {
			label: 'To use husky',
			commands: ['git config --unset core.hooksPath']
		});
	}

	const detected = await detectPackageManager(cwd);

	if (detected !== null && !SUPPORTED_AGENTS.has(detected.agent)) {
		throw new CliError(`${detected.agent} is not supported`, {
			hint: `Supported: ${SUPPORTED_LIST}`
		});
	}

	const pm = (detected === null ? 'npm' : detected.name) as PackageManagerName;
	const pmVersion = await installedVersion(pm, cwd, false);

	if (pm === 'pnpm' && existsSync(join(cwd, 'pnpm-workspace.yaml'))) {
		ensurePnpmWorkspaceMergeable(cwd);
	}

	const fileConflicts = ownedConflicts(cwd, options.vscode !== false);

	const keyConflicts = (['eslint', 'prettier', 'commitlint'] as const).flatMap((tool) => {
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

		const hint = withVscode ? '--no-vscode keeps .vscode/ as it is' : undefined;

		throw new CliError(`already set up: ${conflicts.join(', ')}`, {
			label: 'To replace them',
			commands: ['jss-devtools init --force'],
			...(hint === undefined ? {} : { hint })
		});
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
