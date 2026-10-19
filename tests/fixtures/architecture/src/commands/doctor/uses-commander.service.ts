import { Command } from 'commander';

export const make = (): Command => {
	return new Command('sample');
};
