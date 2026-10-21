import { gitInstalledCheck } from '@/commands/doctor/checks/git-installed.check';
import { gitRepositoryCheck } from '@/commands/doctor/checks/git-repository.check';
import { nodeVersionCheck } from '@/commands/doctor/checks/node-version.check';
import { gitVersion, isInsideWorkTree } from '@/core/adapters/git.adapter';

import type { DoctorCheck, DoctorContext, DoctorResult } from '@/commands/doctor/types/doctor-check.type';

export const doctorChecks: readonly DoctorCheck[] = [nodeVersionCheck, gitInstalledCheck, gitRepositoryCheck];

export const createDoctorContext = async (): Promise<DoctorContext> => {
	return {
		cwd: process.cwd(),
		nodeVersion: process.version,
		git: {
			version: await gitVersion(),
			isInsideWorkTree
		}
	};
};

export const runDoctorChecks = async (context: DoctorContext): Promise<DoctorResult[]> => {
	const results: DoctorResult[] = [];

	for (const check of doctorChecks) {
		results.push(await check.run(context));
	}

	return results;
};
