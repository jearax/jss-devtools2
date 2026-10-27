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
import { applyInitPlan } from './write.service';

import type { PackageManagerName } from './templates/package-json.template';
import type { InitOptions } from './types/init-options.type';
import type { InitPreflight } from './types/init-plan.type';
import type { Command } from 'commander';

const DIR_DESCRIPTION =
	'create a new project in this folder (missing or empty); without it, set up the project in the current folder';

const PM_CHOICES: readonly PackageManagerName[] = ['npm', 'yarn', 'pnpm', 'bun'];

const EXAMPLES = `
Examples:
  $ jss-devtools init my-app              create my-app, asking for the package manager
  $ jss-devtools init my-app --pm pnpm -y create my-app with pnpm, no questions (CI)
  $ jss-devtools init                     set up the project in the current folder
  $ jss-devtools init --dry-run           show what would change, write nothing
  $ jss-devtools init -f                  replace existing ESLint, Prettier and commitlint configs`;

export const registerInitCommand = (program: Command): void => {
	program
		.command('init')
		.description('create a project, or set up the current one')
		.argument('[dir]', DIR_DESCRIPTION)
		.addOption(
			new Option('--framework <name>', 'the preset to apply; only node is built so far')
				.choices(['node', 'react', 'rn', 'next', 'nest'])
				.default('node')
		)
		.addOption(
			new Option(
				'--pm <name>',
				`package manager for a new project; asked when omitted, npm with --yes. Not accepted without <dir>: the current folder's manager is detected`
			).choices([...PM_CHOICES])
		)
		.option(
			'-f, --force',
			'replace the config files init owns when they already exist, and delete their other names (default: off; init stops and lists them)'
		)
		.option('--no-vscode', 'do not write .vscode/ (default: written)')
		.option(COMMON_OPTIONS.yes.flags, COMMON_OPTIONS.yes.description)
		.option(COMMON_OPTIONS.dryRun.flags, COMMON_OPTIONS.dryRun.description)
		.addHelpText('after', EXAMPLES)
		.action(runInit);
};

const askPackageManager = async (dirGiven: boolean, options: InitOptions): Promise<PackageManagerName | undefined> => {
	// existing mode detects the manager in preflight; no answered question feeds it
	if (!dirGiven) {
		return undefined;
	}

	if (options.pm !== undefined) {
		return options.pm;
	}

	if (options.yes === true || options.dryRun === true) {
		return 'npm';
	}

	const chosen = await select({
		message: 'package manager',
		options: PM_CHOICES.map((pm) => {
			return {
				value: pm,
				label: pm
			};
		})
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

const nextStep = (preflight: InitPreflight, command: string): string => {
	const cd = preflight.mode === 'create' ? `cd ${preflight.projectName} && ` : '';

	return `${cd}${command}`;
};

const sortPackageJson = async (preflight: InitPreflight, cwd: string): Promise<void> => {
	const bins = [
		['prettier-package-json', ['--write', 'package.json']],
		['prettier', ['--write', 'package.json']]
	] as const;

	for (const [bin, args] of bins) {
		const result = await runLocalBin(preflight.pm, bin, [...args], cwd);

		if (result.code !== 0) {
			throw new CliError(
				`${bin} failed; the files are written. To finish: ${nextStep(preflight, localBinCommandLine(preflight.pm, bin, [...args]))}`
			);
		}
	}
};

const installError = (preflight: InitPreflight): CliError => {
	return new CliError(
		`install failed; the files are written. To finish: ${nextStep(preflight, `${preflight.pm} install`)}`
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
	const plan = buildInitPlan(preflight, withPm(options, pm));

	log.message(renderPlan(plan));

	if (options.dryRun === true) {
		outro(`Dry run: ${plan.entries.length} files would be written`);

		return;
	}

	// -y takes the default answer, which is yes
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
		throw installError(preflight);
	}

	await sortPackageJson(preflight, plan.targetDir);

	outro(preflight.mode === 'create' ? `next: cd ${preflight.projectName}, ${preflight.pm} run dev` : 'done');
};
