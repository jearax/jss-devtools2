import { runCommand } from '@/core/utils/run-command.util';

export type GitVersion =
	{ status: 'ok'; output: string } | { status: 'missing'; problem: string } | { status: 'failed'; problem: string };

export const gitVersion = async (): Promise<GitVersion> => {
	const result = await runCommand('git', ['--version']);

	if (result.code === null) {
		return {
			status: 'missing',
			problem: 'Git is not installed'
		};
	}

	if (result.code !== 0) {
		return {
			status: 'failed',
			problem: `git --version failed with exit code ${result.code}`
		};
	}

	const output = result.stdout.trim();

	if (output.length === 0) {
		return {
			status: 'failed',
			problem: 'git --version printed nothing'
		};
	}

	return {
		status: 'ok',
		output
	};
};

export const isInsideWorkTree = async (cwd: string): Promise<boolean> => {
	const result = await runCommand('git', ['rev-parse', '--is-inside-work-tree'], { cwd });

	return result.code === 0 && result.stdout.trim() === 'true';
};

export const gitInit = async (cwd: string): Promise<boolean> => {
	const result = await runCommand('git', ['init', '-q', '-b', 'main'], { cwd });

	return result.code === 0;
};

export const gitHooksPath = async (cwd: string): Promise<string | null> => {
	const result = await runCommand('git', ['config', '--get', 'core.hooksPath'], { cwd });

	return result.code === 0 ? result.stdout.trim() : null;
};

export const gitTopLevel = async (cwd: string): Promise<string | null> => {
	const result = await runCommand('git', ['rev-parse', '--show-toplevel'], { cwd });

	return result.code === 0 ? result.stdout.trim() : null;
};
