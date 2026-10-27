import { detect, resolveCommand } from 'package-manager-detector';

import { runCommand } from '@/core/utils/run-command.util';

import type { RunResult } from '@/core/utils/run-command.util';
import type { Agent, Command, DetectResult, ResolvedCommand } from 'package-manager-detector';

export type PackageManagerName = DetectResult['name'];

export const detectPackageManager = async (cwd: string): Promise<DetectResult | null> => {
	return detect({
		cwd,
		stopDir: cwd
	});
};

export const packageManagerVersion = async (pm: PackageManagerName, cwd: string): Promise<string | null> => {
	const result = await runCommand(pm, ['--version'], { cwd });

	return result.code === 0 ? result.stdout.trim() : null;
};

const resolveOrThrow = (agent: Agent, command: Command, args: readonly string[]): ResolvedCommand => {
	const resolved = resolveCommand(agent, command, [...args]);

	if (!resolved) {
		throw new Error(`package-manager-detector has no '${command}' command for '${agent}'`);
	}

	return resolved;
};

export const resolveLocalBin = (pm: Agent, bin: string, args: readonly string[]): ResolvedCommand => {
	return resolveOrThrow(pm, 'execute-local', [bin, ...args]);
};

export const installPackages = async (pm: Agent, cwd: string): Promise<number | null> => {
	const { command, args } = resolveOrThrow(pm, 'install', []);

	const result = await runCommand(command, args, {
		cwd,
		inheritStdio: true
	});

	return result.code;
};

export const runLocalBin = async (pm: Agent, bin: string, args: readonly string[], cwd: string): Promise<RunResult> => {
	const { command, args: binArgs } = resolveLocalBin(pm, bin, args);

	return runCommand(command, binArgs, { cwd });
};
