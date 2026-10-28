import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

import { gitInit } from '@/core/adapters/git.adapter';
import { CliError } from '@/core/errors/cli.error';

import { shellQuote } from './shell-quote.service';

import type { InitPlan, PlanEntry } from './types/init-plan.type';

const writeEntry = (targetDir: string, entry: PlanEntry): void => {
	if (entry.content === undefined) {
		return;
	}

	mkdirSync(dirname(join(targetDir, entry.path)), { recursive: true });
	writeFileSync(join(targetDir, entry.path), entry.content);
};

export const applyInitPlan = async (plan: InitPlan): Promise<void> => {
	if (plan.mode === 'create') {
		mkdirSync(plan.targetDir, { recursive: true });

		if (!(await gitInit(plan.targetDir))) {
			const dir = basename(plan.targetDir);

			throw new CliError(`Could not run git init in ${dir}`, {
				label: 'To see why',
				commands: [`cd ${shellQuote(dir)}`, 'git init']
			});
		}
	}

	for (const entry of plan.entries) {
		if (entry.action !== 'delete') {
			writeEntry(plan.targetDir, entry);
		}
	}

	for (const entry of plan.entries) {
		if (entry.action === 'delete') {
			rmSync(join(plan.targetDir, entry.path));
		}
	}
};
