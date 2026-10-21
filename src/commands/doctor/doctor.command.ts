import { styleText } from 'node:util';

import { intro, outro } from '@clack/prompts';

import { PACKAGE } from '@/core/constants/package.constant';
import { CliError } from '@/core/errors/cli.error';
import { showBanner } from '@/core/ui/banner.ui';
import { renderCheckList } from '@/core/ui/check-list.ui';

import { createDoctorContext, runDoctorChecks } from './doctor.service';

import type { Command } from 'commander';

export const registerDoctorCommand = (program: Command): void => {
	program.command('doctor').description('check the environment').action(runDoctor);
};

const runDoctor = async (): Promise<void> => {
	showBanner();
	intro(styleText('inverse', ` ${PACKAGE.name} doctor `));

	const context = await createDoctorContext();
	const results = await runDoctorChecks(context);

	renderCheckList(results);

	const failed = results.filter((result) => {
		return !result.ok;
	});

	if (failed.length > 0) {
		throw new CliError(`${failed.length} of ${results.length} checks failed`);
	}

	outro(`All ${results.length} checks passed`);
};
