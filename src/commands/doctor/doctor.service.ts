import { gitInstalledCheck } from '@/commands/doctor/checks/git-installed.check.js';
import { gitRepositoryCheck } from '@/commands/doctor/checks/git-repository.check.js';
import { nodeVersionCheck } from '@/commands/doctor/checks/node-version.check.js';
import { gitVersion, isInsideWorkTree } from '@/core/adapters/git.adapter.js';

import type { DoctorCheck, DoctorContext, DoctorResult } from '@/commands/doctor/types/doctor-check.type.js';

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
