import { relative } from 'node:path';
import { styleText } from 'node:util';

import { confirm, intro, isCancel, log, outro, select } from '@clack/prompts';
import { Option } from 'commander';

import { installPackages, localBinCommandLine, runLocalBin } from '@/core/adapters/package-manager.adapter';
import { COMMON_OPTIONS } from '@/core/constants/common-option.constant';
import { PACKAGE } from '@/core/constants/package.constant';
import { CliError } from '@/core/errors/cli.error';
import { showBanner } from '@/core/ui/banner.ui';
import { isInteractive } from '@/core/ui/terminal.ui';

import { validateInitArguments } from './init.service';
import { buildInitPlan, renderPlan } from './plan.service';
import { preflightInit } from './preflight.service';
import { PACKAGE_MANAGERS } from './templates/package-json.template';
import { applyInitPlan } from './write.service';

import type { PackageManagerName } from './templates/package-json.template';
import type { InitOptions } from './types/init-options.type';
import type { InitPreflight } from './types/init-plan.type';
import type { Command } from 'commander';

const DIR_DESCRIPTION =
	'Create a new project in this folder (missing or empty); without it, set up the project in the current folder';

const PM_CHOICES = PACKAGE_MANAGERS;

const EXAMPLES = `
Examples:
  $ jss-devtools init my-app              Create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y Create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     Set up the project in the current folder
  $ jss-devtools init -f                  Replace existing ESLint, Prettier and commitlint configs
  $ jss-devtools init --dry-run           Show what would change, write nothing`;

// Shows `default: "npm"` in help without a parsed default: --pm must stay undefined when it is
// not passed, so the question runs and the no-folder check still errors.
const pmOption = new Option('--pm <name>', 'Package manager for a new project')
	.choices([...PM_CHOICES])
	.default(undefined, 'npm');

export const registerInitCommand = (program: Command): void => {
	program
		.command('init')
		.description('Create a project, or set up the current one')
		.argument('[dir]', DIR_DESCRIPTION)
		.addOption(
			new Option('--framework <name>', 'Preset to apply; only node for now')
				.choices(['node', 'react', 'rn', 'next', 'nest'])
				.default('node')
		)
		.addOption(pmOption)
		.option(
			'-f, --force',
			'Replace the config files init owns when they already exist, and delete their other names (default: off; init stops and lists them)'
		)
		.option('--no-vscode', 'Do not write .vscode/ (default: written)')
		.option(COMMON_OPTIONS.yes.flags, COMMON_OPTIONS.yes.description)
		.option(COMMON_OPTIONS.dryRun.flags, COMMON_OPTIONS.dryRun.description)
		.addHelpText('after', EXAMPLES)
		.action(runInit);
};

const askPackageManager = async (dirGiven: boolean, options: InitOptions): Promise<PackageManagerName | undefined> => {
	if (!dirGiven) {
		return undefined;
	}

	if (options.pm !== undefined) {
		return options.pm;
	}

	if (options.yes === true || options.dryRun === true) {
		return 'npm';
	}

	const chosen = await select<PackageManagerName>({
		message: 'package manager',
		options: PM_CHOICES.map((pm) => {
			return {
				value: pm,
				label: pm
			};
		}),
		initialValue: 'npm'
	});

	if (isCancel(chosen)) {
		throw new CliError('cancelled, nothing written');
	}

	return chosen;
};

const withPm = (options: InitOptions, pm: PackageManagerName | undefined): InitOptions => {
	return pm === undefined
		? options
		: {
				...options,
				pm
			};
};

const shellQuote = (path: string): string => {
	return /^[\w@%+=:,./-]+$/.test(path) ? path : `'${path.replaceAll(`'`, `'\\''`)}'`;
};

const nextStep = (preflight: InitPreflight, target: string, command: string): string => {
	const cd = preflight.mode === 'create' ? `cd ${target} && ` : '';

	return `${cd}${command}`;
};

export const sortFailureMessage = (
	bin: string,
	result: { stdout: string; stderr: string },
	finishCommand: string
): string => {
	const output = result.stderr.trim() || result.stdout.trim();
	const reported = output === '' ? ' ' : `\n${output}\n`;

	return `${bin} failed; the files are written.${reported}To finish: ${finishCommand}`;
};

const sortPackageJson = async (preflight: InitPreflight, target: string, cwd: string): Promise<void> => {
	const bins = [
		['prettier-package-json', ['--write', 'package.json']],
		['prettier', ['--write', 'package.json']]
	] as const;

	for (const [bin, args] of bins) {
		const result = await runLocalBin(preflight.pm, bin, [...args], cwd);

		if (result.code !== 0) {
			throw new CliError(
				sortFailureMessage(bin, result, nextStep(preflight, target, localBinCommandLine(preflight.pm, bin, [...args])))
			);
		}
	}
};

const installError = (preflight: InitPreflight, target: string): CliError => {
	return new CliError(
		`install failed; the files are written. To finish: ${nextStep(preflight, target, `${preflight.pm} install`)}`
	);
};

const runInit = async (dirArg: string | undefined, options: InitOptions): Promise<void> => {
	showBanner();
	intro(styleText('inverse', ` ${PACKAGE.name} init `));

	const positional = dirArg === undefined ? [] : [dirArg];

	validateInitArguments(positional, options);

	if (options.dryRun !== true && options.yes !== true && !isInteractive()) {
		throw new CliError('run it in a terminal, or pass --yes');
	}

	const pm = await askPackageManager(dirArg !== undefined, options);
	const preflight = await preflightInit(process.cwd(), positional, withPm(options, pm));
	const target = shellQuote(relative(process.cwd(), preflight.targetDir) || '.');
	const plan = buildInitPlan(preflight, withPm(options, pm));

	log.message(renderPlan(plan));

	if (options.dryRun === true) {
		outro(`Dry run: ${plan.entries.length} files would be written`);

		return;
	}

	if (options.yes !== true) {
		const confirmed = await confirm({
			message: `write ${plan.entries.length} files to ${preflight.projectName} and install?`,
			initialValue: true
		});

		if (isCancel(confirmed) || confirmed !== true) {
			throw new CliError('cancelled, nothing written');
		}
	}

	await applyInitPlan(plan);

	const code = await installPackages(preflight.pm, plan.targetDir);

	if (code !== 0) {
		throw installError(preflight, target);
	}

	await sortPackageJson(preflight, target, plan.targetDir);

	outro(preflight.mode === 'create' ? `next: cd ${target}, ${preflight.pm} run dev` : 'done');
};
