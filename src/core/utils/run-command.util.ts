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
	onLine?: (line: string) => void;
};

const exitCodeOf = (failure: { code?: unknown }): number | null => {
	if (failure.code === 'ENOENT') {
		return null;
	}

	return typeof failure.code === 'number' ? failure.code : 1;
};

const feedLines = (buffer: string, chunk: string, onLine: (line: string) => void): string => {
	const parts = (buffer + chunk).split(/\r\n|\n|\r/);
	const rest = parts.pop() ?? '';

	for (const line of parts) {
		if (line !== '') {
			onLine(line);
		}
	}

	return rest;
};

// setEncoding keeps a multi-byte character that lands across two chunks whole.
const runStreamed = async (
	file: string,
	args: readonly string[],
	cwd: string | undefined,
	onLine: (line: string) => void
): Promise<RunResult> => {
	return new Promise((resolve) => {
		const child = spawn(file, [...args], {
			cwd,
			stdio: ['ignore', 'pipe', 'pipe']
		});

		let stdout = '';
		let stderr = '';
		let stdoutBuffer = '';
		let stderrBuffer = '';

		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdout.on('data', (text: string) => {
			stdout += text;
			stdoutBuffer = feedLines(stdoutBuffer, text, onLine);
		});
		child.stderr.on('data', (text: string) => {
			stderr += text;
			stderrBuffer = feedLines(stderrBuffer, text, onLine);
		});
		child.on('error', (failure) => {
			resolve({
				code: exitCodeOf(failure as { code?: unknown }),
				stdout,
				stderr
			});
		});
		child.on('close', (code) => {
			if (stdoutBuffer !== '') {
				onLine(stdoutBuffer);
			}

			if (stderrBuffer !== '') {
				onLine(stderrBuffer);
			}

			resolve({
				code: code ?? 1,
				stdout,
				stderr
			});
		});
	});
};

export const runCommand = async (
	file: string,
	args: readonly string[],
	options: RunOptions = {}
): Promise<RunResult> => {
	if (options.onLine) {
		return runStreamed(file, args, options.cwd, options.onLine);
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
