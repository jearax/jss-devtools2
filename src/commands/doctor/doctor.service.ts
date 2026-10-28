import { tmpdir } from 'node:os';

import { gitInstalledCheck } from '@/commands/doctor/checks/git-installed.check';
import { nodeVersionCheck } from '@/commands/doctor/checks/node-version.check';
import { packageManagersCheck } from '@/commands/doctor/checks/package-managers.check';
import { gitVersion } from '@/core/adapters/git.adapter';
import { packageManagerVersion } from '@/core/adapters/package-manager.adapter';

import type {
	DoctorCheck,
	DoctorContext,
	DoctorResult,
	PackageManagerProbe
} from '@/commands/doctor/types/doctor-check.type';
import type { PackageManagerName } from '@/core/adapters/package-manager.adapter';

export const doctorChecks: readonly DoctorCheck[] = [nodeVersionCheck, gitInstalledCheck, packageManagersCheck];

// A project's packageManager field changes what "<pm> --version" answers, so probe outside any project.
export const packageManagerProbeDirectory = tmpdir();

export const createDoctorContext = async (): Promise<DoctorContext> => {
	const probePackageManager: PackageManagerProbe = {
		version: (pm: PackageManagerName) => {
			return packageManagerVersion(pm, packageManagerProbeDirectory);
		}
	};

	return {
		nodeVersion: process.version,
		git: {
			version: await gitVersion()
		},
		pm: probePackageManager
	};
};

export const runDoctorChecks = async (context: DoctorContext): Promise<DoctorResult[]> => {
	const results: DoctorResult[] = [];

	for (const check of doctorChecks) {
		results.push(...(await check.run(context)));
	}

	return results;
};

export const usablePackageManagerCount = (results: readonly DoctorResult[]): number => {
	return results.filter((result) => {
		return result.status === 'ok' && result.id.startsWith('pm.');
	}).length;
};

export const failedCheckCount = (results: readonly DoctorResult[]): number => {
	return results.filter((result) => {
		return result.status === 'fail';
	}).length;
};

export const checkCount = (results: readonly DoctorResult[]): number => {
	return results.filter((result) => {
		return result.status !== 'info';
	}).length;
};

export const readyMessage = (packageManagers: number): string => {
	return `Ready: Node.js, git and ${packageManagers} package manager${packageManagers === 1 ? '' : 's'}`;
};

export const failureMessage = (failed: number, checks: number): string => {
	return `${failed} of ${checks} checks failed`;
};
