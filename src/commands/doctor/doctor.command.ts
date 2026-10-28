import { styleText } from 'node:util';

import { intro, outro } from '@clack/prompts';

import { PACKAGE } from '@/core/constants/package.constant';
import { CliError } from '@/core/errors/cli.error';
import { showBanner } from '@/core/ui/banner.ui';
import { renderCheckList } from '@/core/ui/check-list.ui';

import {
	checkCount,
	createDoctorContext,
	failedCheckCount,
	failureMessage,
	readyMessage,
	runDoctorChecks,
	usablePackageManagerCount
} from './doctor.service';

import type { Command } from 'commander';

export const registerDoctorCommand = (program: Command): void => {
	program.command('doctor').description('Check Node.js, git and the package managers').action(runDoctor);
};

const runDoctor = async (): Promise<void> => {
	showBanner();
	intro(styleText('inverse', ` ${PACKAGE.name} doctor `));

	const context = await createDoctorContext();
	const results = await runDoctorChecks(context);

	renderCheckList(results);

	const failed = failedCheckCount(results);
	const checks = checkCount(results);

	if (failed > 0) {
		throw new CliError(failureMessage(failed, checks));
	}

	outro(readyMessage(usablePackageManagerCount(results)));
};
