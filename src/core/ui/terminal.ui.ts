import { styleText } from 'node:util';

import { log } from '@clack/prompts';

import { CliError } from '@/core/errors/cli.error';

import { createAnimatedSpinner } from './animated-spinner.ui';

/** `isTTY` is stdout, not stderr. */
export type TerminalContext = {
	isTTY?: boolean;
	env?: NodeJS.ProcessEnv;
};

/** A prompt reads stdin, which is a different question from stdout. */
export const isInteractive = (context: TerminalContext = {}): boolean => {
	const isTTY = context.isTTY ?? process.stdout.isTTY === true;
	const env = context.env ?? process.env;
	const ci = env['CI'];

	return isTTY && (ci === undefined || ci === '' || ci === '0' || ci === 'false');
};

export type TerminalSpinner = {
	start(message: string): void;
	update(message: string): void;
	success(message: string): void;
	error(message: string): void;
};

/** Clack writes cursor codes when the output is piped, so the animated one never runs there. */
export const createSpinner = (context: TerminalContext = {}): TerminalSpinner => {
	if (!isInteractive(context)) {
		return {
			start: (message) => {
				log.step(message);
			},
			update: (message) => {
				log.message(message);
			},
			success: (message) => {
				log.success(message);
			},
			error: (message) => {
				log.error(message);
			}
		};
	}

	return createAnimatedSpinner();
};

export type TerminalTask = {
	title: string;
	run: (message: (text: string) => void) => string | void | Promise<string | void>;
};

export const runTasks = async (tasks: readonly TerminalTask[], context: TerminalContext = {}): Promise<void> => {
	for (const task of tasks) {
		const spinner = createSpinner(context);

		spinner.start(task.title);

		try {
			const result = await task.run((text) => {
				spinner.update(text);
			});

			spinner.success(typeof result === 'string' && result.length > 0 ? result : task.title);
		} catch (error) {
			// The task list names the failed task; the error path renders the reason on stderr.
			spinner.error(task.title);

			throw error;
		}
	}
};

export const renderError = (error: unknown): void => {
	const message = error instanceof Error ? error.message : String(error);
	const stderr = { stream: process.stderr };

	process.stderr.write(`${styleText('gray', '│', stderr)}\n`);
	process.stderr.write(`${styleText('gray', '└', stderr)}  ${styleText('red', message, stderr)}\n`);

	if (error instanceof CliError && error.hint) {
		process.stderr.write(`${styleText('yellow', `   ↳ ${error.hint}`, stderr)}\n`);
	}
};
