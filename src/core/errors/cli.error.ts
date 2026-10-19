import { ExitCode } from '@/core/constants/exit-code.constant.js';

export type CliErrorOptions = {
	exitCode?: ExitCode;
	hint?: string;
};

export class CliError extends Error {
	readonly exitCode: ExitCode;
	readonly hint: string | undefined;

	constructor(message: string, options: CliErrorOptions = {}) {
		super(message);

		this.name = 'CliError';
		this.exitCode = options.exitCode ?? ExitCode.failure;
		this.hint = options.hint;
	}
}
