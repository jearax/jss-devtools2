import type { DoctorCheck } from '@/commands/doctor/types/doctor-check.type';

const CHECK_ID = 'git.installed';

export const gitInstalledCheck: DoctorCheck = {
	id: CHECK_ID,
	run: (context) => {
		const version = context.git.version;

		if (version.status === 'ok') {
			return [
				{
					id: CHECK_ID,
					label: 'Git',
					status: 'ok',
					detail: version.output.replace(/^git version /, '')
				}
			];
		}

		if (version.status === 'missing') {
			return [
				{
					id: CHECK_ID,
					label: 'Git',
					status: 'fail',
					detail: version.problem,
					hint: 'Install git, then run the command again'
				}
			];
		}

		return [
			{
				id: CHECK_ID,
				label: 'Git',
				status: 'fail',
				detail: version.problem
			}
		];
	}
};
