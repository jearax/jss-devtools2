import { realpathSync } from 'node:fs';

import { Command, CommanderError } from 'commander';

import { registerDoctorCommand } from '@/commands/doctor/doctor.command';
import { registerInitCommand } from '@/commands/init/init.command';
import { PACKAGE } from '@/core/constants/package.constant';
import { CliError } from '@/core/errors/cli.error';
import { bannerText, showBanner } from '@/core/ui/banner.ui';
import { isInteractive, renderError } from '@/core/ui/terminal.ui';

export type ProgramOptions = {
	exitOverride?: boolean;
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
		.version(PACKAGE.version, '-v, --version')
		.showHelpAfterError(true)
		.showSuggestionAfterError(true)
		.allowExcessArguments(false);

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
