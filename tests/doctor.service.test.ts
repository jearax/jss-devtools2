import { describe, expect, it } from 'vitest';

import { runDoctorChecks } from '@/commands/doctor/doctor.service';
import { PACKAGE } from '@/core/constants/package.constant';

import type { DoctorContext, DoctorResult, GitProbe } from '@/commands/doctor/types/doctor-check.type';

const gitUsable: GitProbe = {
	version: {
		status: 'ok',
		output: 'git version 2.55.0'
	},
	isInsideWorkTree: () => {
		return Promise.resolve(true);
	}
};

const context = (overrides: Partial<DoctorContext> = {}): DoctorContext => {
	return {
		cwd: '/tmp',
		nodeVersion: `v${PACKAGE.nodeFloor}`,
		git: gitUsable,
		...overrides
	};
};

const resultOf = (results: readonly DoctorResult[], id: string): DoctorResult => {
	const result = results.find((entry) => {
		return entry.id === id;
	});

	if (!result) {
		throw new Error(`no doctor result for ${id}`);
	}

	return result;
};

describe('the doctor checks', () => {
	it('reports every check in a fixed order', async () => {
		const results = await runDoctorChecks(context());

		expect(
			results.map((result) => {
				return result.id;
			})
		).toEqual(['node.version', 'git.installed', 'git.repository']);
	});

	it('passes when the node is supported and git is in a work tree', async () => {
		const results = await runDoctorChecks(context());
		const node = resultOf(results, 'node.version');
		const git = resultOf(results, 'git.installed');

		expect(
			results.every((result) => {
				return result.ok;
			})
		).toBe(true);
		expect(node.label).toBe('Node.js');
		expect(node.detail).toBe(`v${PACKAGE.nodeFloor}`);
		expect(node.note).toBe(`needs >= ${PACKAGE.nodeFloor}`);
		expect(git.label).toBe('Git');
		expect(git.detail).toBe('2.55.0');
	});

	it('fails the node check below the floor', async () => {
		const results = await runDoctorChecks(context({ nodeVersion: 'v20.0.0' }));
		const node = resultOf(results, 'node.version');

		expect(node.ok).toBe(false);
		expect(node.detail).toContain('20.0.0');
		expect(node.hint).toBe(`Install Node ${PACKAGE.nodeFloor} or newer`);
	});

	it('fails the git check when git is not installed', async () => {
		const results = await runDoctorChecks(
			context({
				git: {
					version: {
						status: 'missing',
						problem: 'git is not installed'
					},
					isInsideWorkTree: () => {
						return Promise.resolve(false);
					}
				}
			})
		);

		const git = resultOf(results, 'git.installed');

		expect(git.ok).toBe(false);
		expect(git.detail).toBe('git is not installed');
		expect(git.hint).toBe('Install git, then run the command again');
	});

	it('fails the git check when git does not answer', async () => {
		const results = await runDoctorChecks(
			context({
				git: {
					version: {
						status: 'failed',
						problem: 'git --version failed with exit code 3'
					},
					isInsideWorkTree: () => {
						return Promise.resolve(false);
					}
				}
			})
		);

		const git = resultOf(results, 'git.installed');

		expect(git.ok).toBe(false);
		expect(git.detail).toBe('git --version failed with exit code 3');
		expect(git.hint).toBeUndefined();
	});

	it('skips the repository check when git is not usable', async () => {
		const results = await runDoctorChecks(
			context({
				git: {
					version: {
						status: 'missing',
						problem: 'git is not installed'
					},
					isInsideWorkTree: () => {
						return Promise.resolve(false);
					}
				}
			})
		);

		const repository = resultOf(results, 'git.repository');

		expect(repository.ok).toBe(false);
		expect(repository.detail).toBe('skipped: needs git');
		expect(repository.hint).toBeUndefined();
	});

	it('fails the repository check outside a work tree', async () => {
		const results = await runDoctorChecks(
			context({
				git: {
					version: {
						status: 'ok',
						output: 'git version 2.55.0'
					},
					isInsideWorkTree: () => {
						return Promise.resolve(false);
					}
				}
			})
		);

		const repository = resultOf(results, 'git.repository');

		expect(repository.ok).toBe(false);
		expect(repository.label).toBe('Git repository');
		expect(repository.hint).toBe('Run `git init`, or cd into a repository');
	});
});
