import { realpathSync } from 'node:fs';

import { Command, CommanderError } from 'commander';

/** Injected by tsdown (`define` in tsdown.config.ts) and by vitest.config.ts. */
declare const __JSS_VERSION__: string;

const pkg = {
	name: 'jss-devtools',
	description: 'JavaScript stack dev tools CLI',
	version: __JSS_VERSION__
};

export type ProgramOptions = {
	/** Tests set this so a failing command rejects instead of killing the runner. */
	exitOverride?: boolean;
};

/** Commander reports an unknown command only when subcommands exist, and "too many arguments"
 * otherwise. Registered at parse time, because command modules attach after `createProgram` returns. */
const addUnknownCommandFallback = (program: Command): void => {
	if (program.commands.length > 0) {
		return;
	}

	program.on('command:*', (operands: string[]) => {
		const [unknown = ''] = operands;

		program.error(`error: unknown command '${unknown}'`, { code: 'commander.unknownCommand' });
	});
};

// Only `src/cli.ts` may construct the root command: modules attach to it, they do not replace it.
export const createProgram = ({ exitOverride = false }: ProgramOptions = {}): Command => {
	const program = new Command();

	program
		.name(pkg.name)
		.description(pkg.description)
		.version(pkg.version)
		.showHelpAfterError(true)
		.showSuggestionAfterError(true)
		.allowExcessArguments(false);

	if (exitOverride) {
		program.exitOverride();
	}

	return program;
};

/** One line on stderr, stack under `JSS_DEBUG=1`. Never exit 0: the last release shipped that bug. */
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

	addUnknownCommandFallback(program);

	try {
		await program.parseAsync([...argv]);
	} catch (error) {
		// CommanderError carries the intended code: 0 for --help and --version, 1 for a failure.
		if (error instanceof CommanderError) {
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
