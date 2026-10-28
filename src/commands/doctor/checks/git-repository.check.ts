import type { DoctorCheck } from '@/commands/doctor/types/doctor-check.type';

const CHECK_ID = 'git.repository';

export const gitRepositoryCheck: DoctorCheck = {
	id: CHECK_ID,
	run: async (context) => {
		if (context.git.version.status !== 'ok') {
			return {
				id: CHECK_ID,
				label: 'Git repository',
				ok: false,
				detail: 'skipped: needs git'
			};
		}

		const inside = await context.git.isInsideWorkTree(context.cwd);

		if (!inside) {
			return {
				id: CHECK_ID,
				label: 'Git repository',
				ok: false,
				detail: 'not a git repository',
				hint: 'Run `git init`, or cd into a repository'
			};
		}

		return {
			id: CHECK_ID,
			label: 'Git repository',
			ok: true,
			detail: 'inside a git repository'
		};
	}
};
