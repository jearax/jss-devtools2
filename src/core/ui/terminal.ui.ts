import { styleText } from 'node:util';

import { log, taskLog } from '@clack/prompts';

import { CliError } from '@/core/errors/cli.error';

import { createAnimatedSpinner } from './animated-spinner.ui';

/** `isTTY` is stdout, not stderr. */
export type TerminalContext = {
	isTTY?: boolean;
	env?: NodeJS.ProcessEnv;
	columns?: number | undefined;
};

/** A prompt reads stdin, which is a different question from stdout. */
export const isInteractive = (context: TerminalContext = {}): boolean => {
	const isTTY = context.isTTY ?? process.stdout.isTTY === true;
	const env = context.env ?? process.env;
	const ci = env['CI'];
	// A pty with 0 columns makes clack's cursor rendering loop forever.
	const columns = context.columns ?? process.stdout.columns;

	return isTTY && (columns ?? 0) > 0 && (ci === undefined || ci === '' || ci === '0' || ci === 'false');
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

export type TerminalTaskLog = {
	message(line: string): void;
	success(summary: string): void;
	error(): void;
};

export const taskLogSummary = (lead: string, seconds: number, context: TerminalContext = {}): string => {
	const time = `(${seconds.toFixed(1)}s)`;

	return `${lead} ${isInteractive(context) ? styleText('dim', time) : time}`;
};

// Clack's taskLog writes cursor codes even when piped.
export const createTaskLog = (title: string, context: TerminalContext = {}): TerminalTaskLog => {
	if (!isInteractive(context)) {
		log.step(title);

		return {
			message: (line) => {
				process.stdout.write(`│  ${line}\n`);
			},
			success: (summary) => {
				log.step(summary);
			},
			error: () => {
				log.error(title);
			}
		};
	}

	const task = taskLog({
		title,
		limit: 5,
		retainLog: true
	});

	return {
		message: (line) => {
			task.message(line);
		},
		success: (summary) => {
			task.success(summary);
		},
		error: () => {
			task.error(title);
		}
	};
};

export const nextStepLines = (
	commands: readonly string[],
	stream: NodeJS.WritableStream = process.stdout
): string[] => {
	return commands.map((command) => {
		return `     ${styleText('dim', '$ ', { stream })}${styleText('cyan', command, { stream })}`;
	});
};

export const nextStepBlock = (
	label: string,
	commands: readonly string[],
	stream: NodeJS.WritableStream = process.stdout
): string[] => {
	return [`   ${label}:`, ...nextStepLines(commands, stream)];
};

export const renderError = (error: unknown): void => {
	const message = error instanceof Error ? error.message : String(error);
	const stderr = { stream: process.stderr };

	process.stderr.write(`${styleText('gray', '│', stderr)}\n`);

	const [firstLine = message, ...restLines] = message.split('\n');

	process.stderr.write(`${styleText('gray', '└', stderr)}  ${styleText('red', firstLine, stderr)}\n`);

	for (const line of restLines) {
		process.stderr.write(`${line === '' ? '' : `   ${line}`}\n`);
	}

	if (error instanceof CliError && error.commands !== undefined && error.commands.length > 0) {
		for (const line of nextStepBlock('To finish', error.commands, process.stderr)) {
			process.stderr.write(`${line}\n`);
		}
	} else if (error instanceof CliError && error.hint) {
		process.stderr.write(`${styleText('yellow', `   ↳ ${error.hint}`, stderr)}\n`);
	}
};
