import { execFile, spawn } from 'node:child_process';
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
	inheritStdio?: boolean;
};

const exitCodeOf = (failure: { code?: unknown }): number | null => {
	if (failure.code === 'ENOENT') {
		return null;
	}

	return typeof failure.code === 'number' ? failure.code : 1;
};

// execFile does not take a stdio option, so an inherited run goes through spawn and captures nothing.
const runInherited = async (file: string, args: readonly string[], cwd: string | undefined): Promise<RunResult> => {
	return new Promise((resolve) => {
		const child = spawn(file, [...args], {
			cwd,
			stdio: 'inherit'
		});

		child.on('error', (failure) => {
			const code = (failure as { code?: number | string }).code;

			resolve({
				code: exitCodeOf({ code }),
				stdout: '',
				stderr: ''
			});
		});
		child.on('close', (code) => {
			resolve({
				code: code ?? 1,
				stdout: '',
				stderr: ''
			});
		});
	});
};

export const runCommand = async (
	file: string,
	args: readonly string[],
	options: RunOptions = {}
): Promise<RunResult> => {
	if (options.inheritStdio) {
		return runInherited(file, args, options.cwd);
	}

	try {
		const { stdout, stderr } = await execFileAsync(file, [...args], {
			cwd: options.cwd,
			encoding: 'utf8'
		});

		return {
			code: 0,
			stdout: stdout ?? '',
			stderr: stderr ?? ''
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
