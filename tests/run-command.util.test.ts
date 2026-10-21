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
});
