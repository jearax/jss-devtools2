import { CliError } from '@/core/errors/cli.error';

import type { InitOptions } from './types/init-options.type';
import type { InitMode } from './types/init-plan.type';

export const validateInitArguments = (positional: readonly string[], options: InitOptions): void => {
	const dir = positional[0];

	if (options.framework !== undefined && options.framework !== 'node') {
		throw new CliError(`${options.framework} is not supported yet; only node is`);
	}

	if (dir === undefined && options.pm !== undefined) {
		throw new CliError('--pm only applies when creating a project; here the package manager is detected');
	}

	if (dir !== undefined && options.force === true) {
		throw new CliError(
			'-f, --force only applies when setting up an existing project; a new project has nothing to replace'
		);
	}
};

export const resolveInitMode = (positional: readonly string[]): InitMode => {
	return positional[0] === undefined ? 'existing' : 'create';
};
