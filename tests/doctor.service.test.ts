import { dirname, join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
	checkCount,
	createDoctorContext,
	failedCheckCount,
	failureMessage,
	packageManagerProbeDirectory,
	readyMessage,
	runDoctorChecks,
	usablePackageManagerCount
} from '@/commands/doctor/doctor.service';
import { PACKAGE } from '@/core/constants/package.constant';

import type { DoctorContext, DoctorResult, GitProbe } from '@/commands/doctor/types/doctor-check.type';
import type * as packageManagerAdapter from '@/core/adapters/package-manager.adapter';

const probeCalls = vi.hoisted(() => {
	return [] as string[];
});

vi.mock('@/core/adapters/package-manager.adapter', async (importOriginal) => {
	const actual = await importOriginal<typeof packageManagerAdapter>();

	return {
		...actual,
		packageManagerVersion: async (pm: Parameters<typeof actual.packageManagerVersion>[0], cwd: string) => {
			probeCalls.push(cwd);

			return actual.packageManagerVersion(pm, cwd);
		}
	};
});

const gitUsable: GitProbe = {
	version: {
		status: 'ok',
		output: 'git version 2.55.0'
	}
};

const pmProbe = (versions: Partial<Record<string, string | null>> = {}) => {
	return {
		version: (pm: string) => {
			return Promise.resolve(versions[pm] ?? null);
		}
	};
};

const context = (overrides: Partial<DoctorContext> = {}): DoctorContext => {
	return {
		nodeVersion: `v${PACKAGE.nodeFloor}`,
		git: gitUsable,
		pm: pmProbe(),
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

const rowIds = (results: readonly DoctorResult[]): readonly string[] => {
	return results.map((result) => {
		return result.id;
	});
};

describe('the doctor checks', () => {
	it('reports the machine checks in a fixed order', async () => {
		const results = await runDoctorChecks(context());

		expect(rowIds(results)).toEqual([
			'node.version',
			'git.installed',
			'pm.bun',
			'pm.pnpm',
			'pm.yarn',
			'pm.npm',
			'package.managers'
		]);
	});

	it('passes when the machine is ready', async () => {
		const results = await runDoctorChecks(
			context({
				pm: pmProbe({
					bun: '1.3.8',
					pnpm: '11.24.0',
					yarn: '1.22.22',
					npm: '11.6.2'
				})
			})
		);

		const node = resultOf(results, 'node.version');
		const git = resultOf(results, 'git.installed');

		expect(
			results.every((result) => {
				return result.status === 'ok';
			})
		).toBe(true);
		expect(node.label).toBe('Node.js');
		expect(node.detail).toBe(`v${PACKAGE.nodeFloor}`);
		expect(node.note).toBe(`needs >= ${PACKAGE.nodeFloor}`);
		expect(git.label).toBe('Git');
		expect(git.detail).toBe('2.55.0');
		expect(resultOf(results, 'pm.bun').detail).toBe('1.3.8');
		expect(usablePackageManagerCount(results)).toBe(4);
	});

	it('fails the node check below the floor', async () => {
		const results = await runDoctorChecks(context({ nodeVersion: 'v20.0.0' }));
		const node = resultOf(results, 'node.version');

		expect(node.status).toBe('fail');
		expect(node.detail).toContain('20.0.0');
		expect(node.hint).toBe(`Install Node ${PACKAGE.nodeFloor} or newer`);
	});

	it('fails the git check when git is not installed', async () => {
		const results = await runDoctorChecks(
			context({
				git: {
					version: {
						status: 'missing',
						problem: 'Git is not installed'
					}
				}
			})
		);

		const git = resultOf(results, 'git.installed');

		expect(git.status).toBe('fail');
		expect(git.detail).toBe('Git is not installed');
		expect(git.hint).toBe('Install git, then run the command again');
	});

	it('fails the git check when git does not answer', async () => {
		const results = await runDoctorChecks(
			context({
				git: {
					version: {
						status: 'failed',
						problem: 'git --version failed with exit code 3'
					}
				}
			})
		);

		const git = resultOf(results, 'git.installed');

		expect(git.status).toBe('fail');
		expect(git.detail).toBe('git --version failed with exit code 3');
		expect(git.hint).toBeUndefined();
	});

	it('shows a missing package manager as an info row, not a failure', async () => {
		const results = await runDoctorChecks(context({ pm: pmProbe({ npm: '11.6.2' }) }));

		const yarn = resultOf(results, 'pm.bun');

		expect(yarn.status).toBe('info');
		expect(yarn.detail).toBe('not installed');
		expect(failedCheckCount(results)).toBe(0);
		expect(checkCount(results)).toBe(3);
		expect(usablePackageManagerCount(results)).toBe(1);
	});

	it('shows yarn 2 or newer as an info row that init cannot use', async () => {
		const results = await runDoctorChecks(
			context({
				pm: pmProbe({
					yarn: '4.5.0',
					npm: '11.6.2'
				})
			})
		);

		const yarn = resultOf(results, 'pm.yarn');

		expect(yarn.status).toBe('info');
		expect(yarn.detail).toBe('4.5.0');
		expect(yarn.note).toBe('init supports yarn 1 only');
		expect(usablePackageManagerCount(results)).toBe(1);
	});

	it('fails with one Package manager row when no manager is usable', async () => {
		const results = await runDoctorChecks(
			context({
				pm: pmProbe({ yarn: '4.5.0' })
			})
		);

		const none = resultOf(results, 'package.managers');

		expect(none.status).toBe('fail');
		expect(none.label).toBe('Package manager');
		expect(none.detail).toBe('none found');
		expect(none.hint).toBe('Install npm, pnpm, yarn 1 or bun');
		expect(failedCheckCount(results)).toBe(1);
		expect(checkCount(results)).toBe(3);
	});

	it('counts the failure against the checks, ignoring info rows', async () => {
		const results = await runDoctorChecks(
			context({
				nodeVersion: 'v20.0.0',
				pm: pmProbe()
			})
		);

		expect(failedCheckCount(results)).toBe(2);
		expect(checkCount(results)).toBe(3);
	});

	it('words the ready outro in singular and plural', () => {
		expect(readyMessage(1)).toBe('Ready: Node.js, git and 1 package manager');
		expect(readyMessage(3)).toBe('Ready: Node.js, git and 3 package managers');
	});

	it('words the failure message from the failed and check counts', () => {
		expect(failureMessage(1, 3)).toBe('1 of 3 checks failed');
	});

	it('probes the package managers outside the working folder', async () => {
		const context = await createDoctorContext();

		await context.pm.version('npm');

		expect(probeCalls).toEqual([packageManagerProbeDirectory]);
		expect(probeCalls[0]).not.toBe(process.cwd());

		const { access } = await import('node:fs/promises');

		for (let dir = packageManagerProbeDirectory; ; dir = dirname(dir)) {
			await expect(access(join(dir, 'package.json'))).rejects.toThrow();

			const parent = dirname(dir);

			if (parent === dir) {
				break;
			}
		}
	});
});
