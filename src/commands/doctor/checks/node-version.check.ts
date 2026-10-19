import { PACKAGE } from '@/core/constants/package.constant.js';
import { isVersionAtLeast } from '@/core/utils/version.util.js';

import type { DoctorCheck } from '@/commands/doctor/types/doctor-check.type.js';

const CHECK_ID = 'node.version';

export const nodeVersionCheck: DoctorCheck = {
	id: CHECK_ID,
	run: (context) => {
		const ok = isVersionAtLeast(context.nodeVersion, PACKAGE.nodeFloor);
		const detail = context.nodeVersion;
		const note = `needs >= ${PACKAGE.nodeFloor}`;

		if (!ok) {
			return {
				id: CHECK_ID,
				label: 'Node.js',
				ok: false,
				detail,
				note,
				hint: `install Node ${PACKAGE.nodeFloor} or newer`
			};
		}

		return {
			id: CHECK_ID,
			label: 'Node.js',
			ok: true,
			detail,
			note
		};
	}
};
