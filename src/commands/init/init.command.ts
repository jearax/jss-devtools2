import { relative } from 'node:path';
import { styleText } from 'node:util';

import { confirm, intro, isCancel, log, outro, select } from '@clack/prompts';
import { Option } from 'commander';

import { installPackages, localBinCommandLine, runLocalBin } from '@/core/adapters/package-manager.adapter';
import { COMMON_OPTIONS } from '@/core/constants/common-option.constant';
import { PACKAGE } from '@/core/constants/package.constant';
import { CliError } from '@/core/errors/cli.error';
import { showBanner } from '@/core/ui/banner.ui';
import {
	createTaskLog,
	helpTitle,
	isInteractive,
	nextStepBlock,
	nextStepLines,
	runTasks,
	taskLogSummary
} from '@/core/ui/terminal.ui';

import { validateInitArguments } from './init.service';
import { buildInitPlan, planActionCounts, renderPlan, renderPlanHeading } from './plan.service';
import { preflightInit } from './preflight.service';
import { shellQuote } from './shell-quote.service';
import { PACKAGE_MANAGERS } from './templates/package-json.template';
import { applyInitPlan } from './write.service';

import type { PackageManagerName } from './templates/package-json.template';
import type { InitOptions } from './types/init-options.type';
import type { InitPreflight } from './types/init-plan.type';
import type { Command } from 'commander';

const DIR_DESCRIPTION = 'Folder for a new project (missing or empty); omit it to set up the current folder';

const PM_CHOICES = PACKAGE_MANAGERS;

const PM_QUESTION_ORDER = [...PACKAGE_MANAGERS].reverse();

const EXAMPLE_ROWS: ReadonlyArray<readonly [string, string]> = [
	['jss-devtools init my-app', 'Create my-app, asking for the package manager'],
	['jss-devtools init my-app --pm pnpm -y', 'Create my-app with pnpm, no questions (CI)'],
	['jss-devtools init', 'Set up the project in the current folder'],
	['jss-devtools init -f', 'Replace existing ESLint, Prettier and commitlint configs'],
	['jss-devtools init --dry-run', 'Show what would change, write nothing']
];

const examplesText = (): string => {
	const commandWidth = Math.max(
		...EXAMPLE_ROWS.map(([command]) => {
			return command.length;
		})
	);

	return [
		'',
		helpTitle('Examples:'),
		...EXAMPLE_ROWS.map(([command, description]) => {
			const gap = ' '.repeat(commandWidth - command.length + 1);

			return `  ${styleText('dim', '$ ')}${styleText('cyan', command)}${gap}${description}`;
		})
	].join('\n');
};

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
			'--force, -f',
			'Replace existing ESLint, Prettier, commitlint and editor configs (init stops and lists them; default: off)'
		)
		.option('--no-vscode', 'Do not write .vscode/ (default: written)')
		.option(COMMON_OPTIONS.yes.flags, COMMON_OPTIONS.yes.description)
		.option(COMMON_OPTIONS.dryRun.flags, COMMON_OPTIONS.dryRun.description)
		.addHelpText('after', examplesText)
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
		message: 'Which package manager?',
		options: PM_QUESTION_ORDER.map((pm) => {
			return {
				value: pm,
				label: pm
			};
		}),
		initialValue: 'npm'
	});

	if (isCancel(chosen)) {
		throw new CliError('Cancelled, nothing written');
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

const nextStepCommands = (preflight: InitPreflight, relativeTarget: string, command: string): string[] => {
	const cd = preflight.mode === 'create' && relativeTarget !== '' ? [`cd ${shellQuote(relativeTarget)}`] : [];

	return [...cd, command];
};

const typedWords = (command: Command): readonly string[] => {
	const rawArgs = (command.parent as { rawArgs?: readonly string[] } | undefined)?.rawArgs ?? [];
	const subIndex = rawArgs.indexOf(command.name());

	return rawArgs.slice(subIndex).filter((word) => {
		return word !== '--dry-run';
	});
};

const applyCommandLine = (command: Command): string => {
	return [PACKAGE.name, ...typedWords(command)].map(shellQuote).join(' ');
};

export const sortFailureMessage = (bin: string, result: { stdout: string; stderr: string }): string => {
	const output = result.stderr.trim() || result.stdout.trim();

	return output === ''
		? `Could not sort package.json with ${bin}; the files are written`
		: `Could not sort package.json with ${bin}; the files are written\n${output}`;
};

const sortPackageJson = async (preflight: InitPreflight, relativeTarget: string, cwd: string): Promise<void> => {
	const bins = [
		['prettier-package-json', ['--write', 'package.json']],
		['prettier', ['--write', 'package.json']]
	] as const;

	for (const [bin, args] of bins) {
		const result = await runLocalBin(preflight.pm, bin, [...args], cwd);

		if (result.code !== 0) {
			throw new CliError(sortFailureMessage(bin, result), {
				commands: nextStepCommands(preflight, relativeTarget, localBinCommandLine(preflight.pm, bin, [...args]))
			});
		}
	}
};

const installError = (preflight: InitPreflight, relativeTarget: string): CliError => {
	return new CliError('Install failed; the files are written', {
		commands: nextStepCommands(preflight, relativeTarget, `${preflight.pm} install`)
	});
};

const runInit = async (dirArg: string | undefined, options: InitOptions, command: Command): Promise<void> => {
	showBanner();
	intro(styleText('inverse', ` ${PACKAGE.name} init `));

	const positional = dirArg === undefined ? [] : [dirArg];

	validateInitArguments(positional, options);

	if (options.dryRun !== true && options.yes !== true && !isInteractive()) {
		throw new CliError('Not a terminal', {
			hint: 'Run it in a terminal, or pass --yes'
		});
	}

	const pm = await askPackageManager(dirArg !== undefined, options);
	const preflight = await preflightInit(process.cwd(), positional, withPm(options, pm));
	const relativeTarget = relative(process.cwd(), preflight.targetDir);
	const plan = buildInitPlan(preflight, withPm(options, pm));

	if (plan.entries.length === 0) {
		outro(`Nothing to change in ${preflight.projectName}`);

		return;
	}

	log.step(renderPlanHeading(plan, preflight.projectName));
	log.message(renderPlan(plan), { spacing: 0 });

	if (options.dryRun === true) {
		outro(['Dry run: nothing written', ...nextStepBlock('To apply', [applyCommandLine(command)])].join('\n'));

		return;
	}

	if (options.yes !== true) {
		const actionCounts = planActionCounts(plan);
		const writeCount = actionCounts.create + actionCounts.update;
		const deleteCount = actionCounts.delete;

		const files = (count: number): string => {
			return count === 1 ? 'file' : 'files';
		};

		const message =
			writeCount === 0 && deleteCount > 0
				? `Delete ${deleteCount} ${files(deleteCount)} in ${preflight.projectName} and install?`
				: deleteCount === 0
					? `Write ${writeCount} ${files(writeCount)} to ${preflight.projectName} and install?`
					: `Write ${writeCount} ${files(writeCount)}; delete ${deleteCount} in ${preflight.projectName} and install?`;

		const confirmed = await confirm({
			message,
			initialValue: true
		});

		if (isCancel(confirmed) || confirmed !== true) {
			throw new CliError('Cancelled, nothing written');
		}
	}

	await applyInitPlan(plan);

	const startedAt = Date.now();
	const installLog = createTaskLog(`Installing with ${preflight.pm}`);

	const code = await installPackages(preflight.pm, plan.targetDir, (line) => {
		installLog.message(line);
	});

	if (code !== 0) {
		installLog.error();

		throw installError(preflight, relativeTarget);
	}

	installLog.success(taskLogSummary(`Installed with ${preflight.pm}`, (Date.now() - startedAt) / 1000));

	await runTasks([
		{
			title: 'Sorting package.json',
			run: async () => {
				await sortPackageJson(preflight, relativeTarget, plan.targetDir);

				return 'Sorted package.json';
			}
		}
	]);

	const nextCommand = preflight.mode === 'create' ? `${preflight.pm} run dev` : `${preflight.pm} run format`;

	outro(['Next steps', ...nextStepLines(nextStepCommands(preflight, relativeTarget, nextCommand))].join('\n'));
};
