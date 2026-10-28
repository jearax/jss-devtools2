export const COMMON_OPTIONS = {
	yes: {
		flags: '--yes, -y',
		description: 'Do not ask; take the default answers (ask in a terminal; default: off)'
	},
	dryRun: {
		flags: '--dry-run',
		description: 'Show the files that would change, write and install nothing (default: off)'
	}
} as const;
