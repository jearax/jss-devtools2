import { describe, expect, it } from 'vitest';

import { runCommand } from '@/core/utils/run-command.util';

describe('running a command', () => {
	it('returns the output and the exit code of a command that works', async () => {
		const result = await runCommand('node', ['--version']);

		expect(result.code).toBe(0);
		expect(result.stdout).toMatch(/^v\d+\./);
	});

	it('returns the exit code of a command that fails', async () => {
		const result = await runCommand('node', ['-e', 'process.exit(3)']);

		expect(result.code).toBe(3);
	});

	it('reports a command that does not exist as missing, not as a crash', async () => {
		const result = await runCommand('jss-devtools-no-such-command', []);

		expect(result.code).toBeNull();
	});

	it('keeps the captured output when the stdio is not inherited', async () => {
		const result = await runCommand('node', ['-e', 'console.log("captured")']);

		expect(result.code).toBe(0);
		expect(result.stdout).toBe('captured\n');
	});

	it('streams lines from both streams to onLine as they arrive', async () => {
		const lines: string[] = [];

		const result = await runCommand(
			'node',
			['-e', 'console.log("out-1"); console.error("err-1"); process.stderr.write("no-newline\\rnext\\n")'],
			{
				onLine: (line) => {
					lines.push(line);
				}
			}
		);

		expect(result.code).toBe(0);
		expect(lines).toEqual(['out-1', 'err-1', 'no-newline', 'next']);
	});

	it('keeps the captured output and the exit code when it streams', async () => {
		const lines: string[] = [];

		const result = await runCommand('node', ['-e', 'console.log("kept"); process.exit(3)'], {
			onLine: (line) => {
				lines.push(line);
			}
		});

		expect(result.code).toBe(3);
		expect(result.stdout).toBe('kept\n');
		expect(lines).toEqual(['kept']);
	});

	it('drops empty lines when it streams', async () => {
		const lines: string[] = [];

		await runCommand('node', ['-e', 'console.log("a\\n\\nb\\n\\n")'], {
			onLine: (line) => {
				lines.push(line);
			}
		});

		expect(lines).toEqual(['a', 'b']);
	});

	it('joins a multi-byte character that lands across two chunks', async () => {
		const lines: string[] = [];

		const result = await runCommand(
			'node',
			[
				'-e',
				'process.stdout.write(Buffer.from([0xe2, 0x9c])); setTimeout(() => { process.stdout.write(Buffer.from([0x93])); console.log(""); console.log("second"); }, 50)'
			],
			{
				onLine: (line) => {
					lines.push(line);
				}
			}
		);

		expect(result.code).toBe(0);
		expect(lines).toEqual(['\u2713', 'second']);
	});

	it('reports a missing command as null with onLine, without calling it', async () => {
		const lines: string[] = [];

		const result = await runCommand('jss-devtools-no-such-command', [], {
			onLine: (line) => {
				lines.push(line);
			}
		});

		expect(result.code).toBeNull();
		expect(lines).toEqual([]);
	});
});
