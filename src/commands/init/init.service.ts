import { CliError } from '@/core/errors/cli.error';

import type { InitOptions } from './types/init-options.type';
import type { InitMode } from './types/init-plan.type';

export const validateInitArguments = (positional: readonly string[], options: InitOptions): void => {
	const dir = positional[0];

	if (options.framework !== undefined && options.framework !== 'node') {
		throw new CliError(`Framework ${options.framework} is not supported yet`, {
			hint: 'Only node is'
		});
	}

	if (dir === undefined && options.pm !== undefined) {
		throw new CliError('Option --pm needs <dir>', {
			hint: 'An existing project uses the manager it has'
		});
	}

	if (dir !== undefined && options.force === true) {
		throw new CliError('Option --force is for an existing project', {
			hint: 'Drop it when creating one'
		});
	}
};

export const resolveInitMode = (positional: readonly string[]): InitMode => {
	return positional[0] === undefined ? 'existing' : 'create';
};
