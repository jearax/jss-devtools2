import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type RunResult = {
	/** The exit code, or null when the command does not exist. */
	code: number | null;
	stdout: string;
	stderr: string;
};

export type RunOptions = {
	cwd?: string;
};

const exitCodeOf = (failure: { code?: number | string }): number | null => {
	if (failure.code === 'ENOENT') {
		return null;
	}

	return typeof failure.code === 'number' ? failure.code : 1;
};

export const runCommand = async (
	file: string,
	args: readonly string[],
	options: RunOptions = {}
): Promise<RunResult> => {
	try {
		const { stdout, stderr } = await execFileAsync(file, [...args], {
			cwd: options.cwd,
			encoding: 'utf8'
		});

		return {
			code: 0,
			stdout,
			stderr
		};
	} catch (error) {
		const failure = error as { code?: number | string; stdout?: string; stderr?: string };

		return {
			code: exitCodeOf(failure),
			stdout: failure.stdout ?? '',
			stderr: failure.stderr ?? ''
		};
	}
};
