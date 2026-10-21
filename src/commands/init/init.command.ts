import { styleText } from 'node:util';

import { intro, outro } from '@clack/prompts';

import { COMMON_OPTIONS } from '@/core/constants/common-option.constant';
import { PACKAGE } from '@/core/constants/package.constant';
import { showBanner } from '@/core/ui/banner.ui';

import type { InitOptions } from './types/init-options.type';
import type { Command } from 'commander';

const EXAMPLES = `
Examples:
  $ jss-devtools init              ask before writing
  $ jss-devtools init --dry-run    show what would change
  $ jss-devtools init --yes        write without asking, e.g. in CI`;

export const registerInitCommand = (program: Command): void => {
	program
		.command('init')
		.description('initialize a project')
		.option(COMMON_OPTIONS.yes.flags, COMMON_OPTIONS.yes.description)
		.option(COMMON_OPTIONS.dryRun.flags, COMMON_OPTIONS.dryRun.description)
		.addHelpText('after', EXAMPLES)
		.action(runInit);
};

const runInit = (_options: InitOptions): void => {
	showBanner();
	intro(styleText('inverse', ` ${PACKAGE.name} init `));

	outro('Nothing to set up');
};
