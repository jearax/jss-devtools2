import { isYarnBerry } from '@/core/adapters/package-manager.adapter';

import type { DoctorCheck, DoctorResult } from '@/commands/doctor/types/doctor-check.type';
import type { PackageManagerName } from '@/core/adapters/package-manager.adapter';

const CHECK_ID = 'package.managers';

const PACKAGE_MANAGERS: readonly PackageManagerName[] = ['bun', 'pnpm', 'yarn', 'npm'];

export const packageManagersCheck: DoctorCheck = {
	id: CHECK_ID,
	run: async (context) => {
		const versions = await Promise.all(
			PACKAGE_MANAGERS.map(async (pm) => {
				return {
					pm,
					version: await context.pm.version(pm)
				};
			})
		);

		const rows: DoctorResult[] = versions.flatMap(({ pm, version }): DoctorResult[] => {
			if (version === null) {
				return [
					{
						id: `pm.${pm}`,
						label: pm,
						status: 'info',
						detail: 'not installed'
					}
				];
			}

			if (isYarnBerry(pm, version)) {
				return [
					{
						id: `pm.${pm}`,
						label: pm,
						status: 'info',
						detail: version,
						note: 'init supports yarn 1 only'
					}
				];
			}

			return [
				{
					id: `pm.${pm}`,
					label: pm,
					status: 'ok',
					detail: version
				}
			];
		});

		const usable = versions.some(({ pm, version }) => {
			return version !== null && !isYarnBerry(pm, version);
		});

		if (!usable) {
			rows.push({
				id: CHECK_ID,
				label: 'Package manager',
				status: 'fail',
				detail: 'none found',
				hint: 'Install npm, pnpm, yarn 1 or bun'
			});
		}

		return rows;
	}
};
