import { ExitCode } from '@/core/constants/exit-code.constant';

export type CliErrorOptions = {
	exitCode?: ExitCode;
	hint?: string;
	commands?: string[];
	label?: string;
};

export class CliError extends Error {
	readonly exitCode: ExitCode;
	readonly hint: string | undefined;
	readonly commands: string[] | undefined;
	readonly label: string | undefined;

	constructor(message: string, options: CliErrorOptions = {}) {
		super(message);

		this.name = 'CliError';
		this.exitCode = options.exitCode ?? ExitCode.failure;
		this.hint = options.hint;
		this.commands = options.commands;
		this.label = options.label;
	}
}
