import { SELECT_INSTRUCTIONS } from '@clack/prompts';
import { afterEach, describe, expect, it } from 'vitest';

import { CliError } from '@/core/errors/cli.error';
import {
	createSpinner,
	createTaskLog,
	isInteractive,
	nextStepLines,
	renderError,
	runTasks,
	taskLogSummary
} from '@/core/ui/terminal.ui';

import { capture } from './support/capture-stream';

const piped = {
	isTTY: false,
	env: {}
};

const terminal = {
	isTTY: true,
	env: {},
	columns: 80
};

const ESC = '\u001b';

const originalNoColor = process.env['NO_COLOR'];
const originalForceColor = process.env['FORCE_COLOR'];

afterEach(() => {
	if (originalNoColor === undefined) {
		delete process.env['NO_COLOR'];
	} else {
		process.env['NO_COLOR'] = originalNoColor;
	}

	if (originalForceColor === undefined) {
		delete process.env['FORCE_COLOR'];
	} else {
		process.env['FORCE_COLOR'] = originalForceColor;
	}
});

describe('interactive terminal detection', () => {
	it('is interactive on a terminal outside CI', () => {
		expect(isInteractive(terminal)).toBe(true);
	});

	it('is not interactive when the output is piped', () => {
		expect(isInteractive(piped)).toBe(false);
	});

	it('is not interactive under CI', () => {
		expect(
			isInteractive({
				isTTY: true,
				env: { CI: 'true' }
			})
		).toBe(false);
	});

	it.each(['', '0', 'false'])('is interactive when CI is %j', (ci) => {
		expect(
			isInteractive({
				isTTY: true,
				env: { CI: ci },
				columns: 80
			})
		).toBe(true);
	});
});

describe('interactive terminal detection, by columns', () => {
	it('is not interactive on a tty that reports zero columns', () => {
		expect(
			isInteractive({
				isTTY: true,
				env: {},
				columns: 0
			})
		).toBe(false);
	});

	it('is not interactive when the width is unknown', () => {
		expect(
			isInteractive({
				isTTY: true,
				env: {},
				columns: undefined
			})
		).toBe(false);
	});

	it('is interactive on a tty with a usable width', () => {
		expect(
			isInteractive({
				isTTY: true,
				env: {},
				columns: 80
			})
		).toBe(true);
	});
});

describe('spinner', () => {
	it('writes plain lines and no escape byte when the output is piped', async () => {
		// Node colours by the environment, not by the layer, so the colour is off here.
		process.env['NO_COLOR'] = '1';

		const output = await capture(process.stdout, () => {
			const spinner = createSpinner(piped);

			spinner.start('Installing dependencies');
			spinner.success('Dependencies installed');
		});

		expect(output).toContain('Installing dependencies');
		expect(output).toContain('Dependencies installed');
		expect(output).not.toContain(ESC);
	});

	it('animates on a terminal', async () => {
		const output = await capture(process.stdout, () => {
			const spinner = createSpinner(terminal);

			spinner.start('Installing dependencies');
			spinner.success('Dependencies installed');
		});

		expect(output).toContain('Installing dependencies');
		expect(output).toContain(ESC);
	});

	it('erases the frame without moving up over the output above it', async () => {
		const output = await capture(process.stdout, () => {
			const spinner = createSpinner(terminal);

			spinner.start('Installing dependencies');
			spinner.success('Dependencies installed');
		});

		// A cursor up of zero still moves up one line, so a one-line frame must not write it.
		expect(output).not.toContain('\u001b[0A');
		expect(output).toContain('\u001b[1G\u001b[J');
	});

	it('installs no global process handler while it runs', async () => {
		const before = {
			unhandledRejection: process.listenerCount('unhandledRejection'),
			uncaughtException: process.listenerCount('uncaughtException'),
			sigint: process.listenerCount('SIGINT'),
			exit: process.listenerCount('exit')
		};

		await capture(process.stdout, () => {
			const spinner = createSpinner(terminal);

			spinner.start('Installing dependencies');

			expect(process.listenerCount('unhandledRejection')).toBe(before.unhandledRejection);
			expect(process.listenerCount('uncaughtException')).toBe(before.uncaughtException);
			expect(process.listenerCount('SIGINT')).toBe(before.sigint);
			expect(process.listenerCount('exit')).toBe(before.exit);

			spinner.success('Dependencies installed');
		});
	});
});

describe('task log', () => {
	it('writes the title step, then every line prefixed, then the summary, without escape bytes', async () => {
		process.env['NO_COLOR'] = '1';

		const output = await capture(process.stdout, () => {
			const task = createTaskLog('Installing with npm', piped);

			task.message('added 248 packages');
			task.message('done in 12s');
			task.success('Installed with npm (12.0s)');
		});

		expect(output.indexOf('◇  Installing with npm')).toBeLessThan(output.indexOf('│  added 248 packages'));
		expect(output.indexOf('│  added 248 packages')).toBeLessThan(output.indexOf('◇  Installed with npm (12.0s)'));
		expect(output).toContain('│  done in 12s');
		expect(output).not.toContain(ESC);
	});

	it('keeps the title line on failure instead of the summary', async () => {
		const output = await capture(process.stdout, () => {
			const task = createTaskLog('Installing with npm', piped);

			task.message('added 248 packages');
			task.error();
		});

		expect(output).toContain('■  Installing with npm');
		expect(output).toContain('│  added 248 packages');
		expect(output).not.toContain('Installed with');
	});

	it('dims the time in the summary on a terminal only', () => {
		expect(taskLogSummary('Installed with npm', 13.14, piped)).toBe('Installed with npm (13.1s)');

		// styleText colours by the real stdout, piped here, so colour is forced to see the dim codes.
		process.env['FORCE_COLOR'] = '1';

		expect(taskLogSummary('Installed with npm', 13.14, terminal)).toBe(`Installed with npm ${ESC}[2m(13.1s)${ESC}[22m`);
		expect(taskLogSummary('Installed with npm', 13.14, piped)).toBe('Installed with npm (13.1s)');
	});
});

describe('tasks', () => {
	it('writes a step line per task and a result line when the output is piped', async () => {
		process.env['NO_COLOR'] = '1';

		const output = await capture(process.stdout, () => {
			return runTasks(
				[
					{
						title: 'Copying the config',
						run: () => {
							return 'Config copied';
						}
					},
					{
						title: 'Installing dependencies',
						run: () => {
							return 'Dependencies installed';
						}
					}
				],
				piped
			);
		});

		expect(output).toContain('Copying the config');
		expect(output).toContain('Config copied');
		expect(output).toContain('Installing dependencies');
		expect(output).toContain('Dependencies installed');
		expect(output).not.toContain(ESC);
	});

	it('writes the progress of a task', async () => {
		const output = await capture(process.stdout, () => {
			return runTasks(
				[
					{
						title: 'Installing dependencies',
						run: (message) => {
							message('resolving');
							message('linking');

							return 'Dependencies installed';
						}
					}
				],
				piped
			);
		});

		expect(output).toContain('resolving');
		expect(output).toContain('linking');
	});

	it('falls back to the title when a task returns nothing', async () => {
		const output = await capture(process.stdout, () => {
			return runTasks(
				[
					{
						title: 'Copying the config',
						run: () => {
							return undefined;
						}
					}
				],
				piped
			);
		});

		expect(output).toContain('Copying the config');
	});

	it('ends the run at a failed task and passes the failure on', async () => {
		const failures: unknown[] = [];

		const output = await capture(process.stdout, async () => {
			try {
				await runTasks(
					[
						{
							title: 'Copying the config',
							run: () => {
								return 'Config copied';
							}
						},
						{
							title: 'Installing dependencies',
							run: () => {
								throw new Error('the install failed');
							}
						},
						{
							title: 'Never runs',
							run: () => {
								return 'never';
							}
						}
					],
					piped
				);
			} catch (error) {
				failures.push(error);
			}
		});

		expect(output).toContain('Installing dependencies');
		expect(output).not.toContain('the install failed');
		expect(output).not.toContain('Never runs');
		expect(failures).toHaveLength(1);
	});

	it('ends the failed task on a terminal too', async () => {
		const output = await capture(process.stdout, async () => {
			await expect(
				runTasks(
					[
						{
							title: 'Installing dependencies',
							run: () => {
								throw new Error('the install failed');
							}
						}
					],
					terminal
				)
			).rejects.toThrow('the install failed');
		});

		expect(output).toContain('Installing dependencies');
	});

	it('writes the result of a task on a terminal', async () => {
		const output = await capture(process.stdout, () => {
			return runTasks(
				[
					{
						title: 'Copying the config',
						run: () => {
							return 'Config copied';
						}
					}
				],
				terminal
			);
		});

		expect(output).toContain('Copying the config');
		expect(output).toContain('Config copied');
	});
});

describe('error rendering', () => {
	it('writes the message and the hint on stderr', async () => {
		process.env['NO_COLOR'] = '1';

		const stderr = await capture(process.stderr, () => {
			renderError(new CliError('the check failed', { hint: 'run it again with --yes' }));
		});

		expect(stderr).toBe(['│', '└  the check failed', '   ↳ run it again with --yes', ''].join('\n'));
	});

	it('writes the message on stderr when there is no hint', async () => {
		process.env['NO_COLOR'] = '1';

		const stderr = await capture(process.stderr, () => {
			renderError(new CliError('the check failed'));
		});

		expect(stderr).toBe(['│', '└  the check failed', ''].join('\n'));
	});

	it('writes the frame corner in gray and the message in red', async () => {
		delete process.env['NO_COLOR'];
		process.env['FORCE_COLOR'] = '1';

		const stderr = await capture(process.stderr, () => {
			renderError(new CliError('the check failed'));
		});

		expect(stderr).toContain('\u001b[90m└\u001b[39m  \u001b[31mthe check failed\u001b[39m');
	});

	it('writes nothing to stdout', async () => {
		const stdout = await capture(process.stdout, async () => {
			await capture(process.stderr, () => {
				renderError(new CliError('the check failed'));
			});
		});

		expect(stdout).toBe('');
	});

	it('survives a non-Error throw', async () => {
		process.env['NO_COLOR'] = '1';

		const stderr = await capture(process.stderr, () => {
			renderError('plain string');
		});

		expect(stderr).toBe(['│', '└  plain string', ''].join('\n'));
	});

	it('writes To finish and the command list on stderr', async () => {
		process.env['NO_COLOR'] = '1';

		const stderr = await capture(process.stderr, () => {
			renderError(new CliError('Install failed; the files are written', { commands: ['cd my-app', 'npm install'] }));
		});

		expect(stderr).toBe(
			[
				'│',
				'└  Install failed; the files are written',
				'   To finish:',
				'     $ cd my-app',
				'     $ npm install',
				''
			].join('\n')
		);
		expect(stderr).not.toContain(ESC);
	});

	it('indents continuation lines of a multi-line message by three spaces, uncoloured', async () => {
		process.env['NO_COLOR'] = '1';

		const stderr = await capture(process.stderr, () => {
			renderError(
				new CliError('Could not sort package.json with prettier-package-json; the files are written\nPrettier 3.9.10')
			);
		});

		expect(stderr).toBe(
			[
				'│',
				'└  Could not sort package.json with prettier-package-json; the files are written',
				'   Prettier 3.9.10',
				''
			].join('\n')
		);
		expect(stderr).not.toContain(ESC);
	});

	it('drops To finish when the error carries no commands', async () => {
		process.env['NO_COLOR'] = '1';

		const stderr = await capture(process.stderr, () => {
			renderError(new CliError('the check failed', { commands: [] }));
		});

		expect(stderr).toBe(['│', '└  the check failed', ''].join('\n'));
	});

	it('dims the $ and colours the command when colour is forced', async () => {
		delete process.env['NO_COLOR'];
		process.env['FORCE_COLOR'] = '1';

		const stderr = await capture(process.stderr, () => {
			renderError(new CliError('Install failed; the files are written', { commands: ['npm install'] }));
		});

		expect(stderr).toContain(`   To finish:\n     ${ESC}[2m$ ${ESC}[22m${ESC}[36mnpm install${ESC}[39m`);
	});
});

describe('next step lines', () => {
	it('writes plain $ lines when the output is piped', () => {
		process.env['NO_COLOR'] = '1';

		const lines = nextStepLines(['cd my-app', 'pnpm run dev']);

		expect(lines).toEqual(['     $ cd my-app', '     $ pnpm run dev']);
	});

	it('colours the $ and the command on a colour-forced stream', () => {
		delete process.env['NO_COLOR'];
		process.env['FORCE_COLOR'] = '1';

		const lines = nextStepLines(['npm install']);

		expect(lines).toEqual([`     ${ESC}[2m$ ${ESC}[22m${ESC}[36mnpm install${ESC}[39m`]);
	});
});

describe('select instructions', () => {
	it('lists navigate, confirm and cancel, so a clack upgrade that changes the footer fails here', () => {
		const withoutStyles = SELECT_INSTRUCTIONS.map((entry) => {
			return entry.replace(new RegExp(`${ESC}\\[\\d+m`, 'g'), '');
		});

		expect(withoutStyles).toEqual(['↑/↓ to navigate', 'Enter: confirm', 'Esc/Ctrl+C: cancel']);
	});
});
