import { realpathSync } from 'node:fs';
import { styleText } from 'node:util';

import { Command, CommanderError, Help } from 'commander';

import { registerDoctorCommand } from '@/commands/doctor/doctor.command';
import { registerInitCommand } from '@/commands/init/init.command';
import { PACKAGE } from '@/core/constants/package.constant';
import { CliError } from '@/core/errors/cli.error';
import { bannerText, showBanner } from '@/core/ui/banner.ui';
import { helpTitle, isInteractive, renderError } from '@/core/ui/terminal.ui';

export type ProgramOptions = {
	exitOverride?: boolean;
};

const styleHelpTerm = (term: string): string => {
	return term
		.split(' ')
		.map((word) => {
			return word[0] === '<' || word[0] === '[' ? styleText('dim', word) : styleText('cyan', word);
		})
		.join(' ');
};

const defaultHelp = new Help();

const optionsLast = (term: string): string => {
	const words = term.split(' ');

	const kept = words.filter((word) => {
		return word !== '[options]';
	});

	return kept.length === words.length ? term : [...kept, '[options]'].join(' ');
};

// Only `src/cli.ts` may construct the root command: commands attach to it, they do not replace it.
export const createProgram = ({ exitOverride = false }: ProgramOptions = {}): Command => {
	const program = new Command();

	// A subcommand copies this setting when it is created, so it has to be set before the commands attach.
	if (exitOverride) {
		program.exitOverride();
	}

	// Before `.version()`, so the banner comes before the version it belongs to.
	program.on('option:version', () => {
		showBanner();
	});

	program
		.name(PACKAGE.name)
		.description(PACKAGE.description)
		.version(PACKAGE.version, '--version, -v', 'Output the version number')
		.helpOption('--help, -h', 'Display help for command')
		.helpCommand('help [command]', 'Display help for command')
		.showHelpAfterError(true)
		.showSuggestionAfterError(true)
		.allowExcessArguments(false);

	// Subcommands copy the help configuration when they are created, so set it before they attach.
	program.configureOutput({
		outputError: (str: string, write: (str: string) => void) => {
			write(str === '' ? str : `${str.charAt(0).toUpperCase()}${str.slice(1)}`);
		}
	});

	program.configureHelp({
		styleTitle: helpTitle,
		commandUsage: (cmd) => {
			return optionsLast(defaultHelp.commandUsage(cmd));
		},
		subcommandTerm: (cmd) => {
			return optionsLast(defaultHelp.subcommandTerm(cmd));
		},
		styleUsage: styleHelpTerm,
		styleOptionTerm: styleHelpTerm,
		styleSubcommandTerm: styleHelpTerm,
		styleArgumentTerm: styleHelpTerm,
		optionDescription: (option) => {
			const parts: string[] = [];

			if (option.argChoices !== undefined) {
				parts.push(
					`values: ${option.argChoices
						.map((choice) => {
							return JSON.stringify(choice);
						})
						.join(' | ')}`
				);
			}

			const defaultValue =
				option.defaultValueDescription !== undefined
					? JSON.stringify(option.defaultValueDescription)
					: option.defaultValue !== undefined
						? JSON.stringify(option.defaultValue)
						: undefined;

			if (defaultValue !== undefined) {
				parts.push(`default: ${defaultValue}`);
			}

			return parts.length === 0 ? option.description : `${option.description} (${parts.join('; ')})`;
		},
		styleOptionDescription: (description) => {
			if (!description.endsWith(')')) {
				return description;
			}

			const start = description.lastIndexOf(' (');

			return start === -1
				? description
				: `${description.slice(0, start)} ${styleText('dim', description.slice(start + 1))}`;
		}
	});

	program.addHelpText('beforeAll', (context) => {
		if (context.error || !isInteractive()) {
			return '';
		}

		return `${bannerText()}\n`;
	});

	registerDoctorCommand(program);
	registerInitCommand(program);

	return program;
};

export const reportFatalError = (error: unknown): void => {
	const message = error instanceof Error ? error.message : String(error);

	process.stderr.write(`${message}\n`);

	if (process.env['JSS_DEBUG'] === '1' && error instanceof Error && error.stack) {
		process.stderr.write(`${error.stack}\n`);
	}

	process.exitCode = 1;
};

export const main = async (argv: readonly string[] = process.argv, options: ProgramOptions = {}): Promise<void> => {
	const program = createProgram(options);

	await runProgram(program, argv);
};

export const runProgram = async (program: Command, argv: readonly string[]): Promise<void> => {
	try {
		// Commander exits 1 when a subcommand is required, so the bare run takes the help path.
		if (argv.length <= 2) {
			program.help();

			return;
		}

		await program.parseAsync([...argv]);
	} catch (error) {
		// CommanderError carries the exit code commander chose.
		if (error instanceof CommanderError) {
			process.exitCode = error.exitCode;

			return;
		}

		if (error instanceof CliError) {
			renderError(error);
			process.exitCode = error.exitCode;

			return;
		}

		reportFatalError(error);
	}
};

// Bin shims and installers run the CLI through a symlink: argv[1] is the link, the module path is
// its target. Comparing them unresolved makes the CLI do nothing and exit 0.
const isDirectRun = (): boolean => {
	const entry = process.argv[1];

	if (!entry) {
		return false;
	}

	try {
		return realpathSync(entry) === import.meta.filename;
	} catch {
		return false;
	}
};

if (isDirectRun()) {
	await main();
}
