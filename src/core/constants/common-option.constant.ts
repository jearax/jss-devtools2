export const COMMON_OPTIONS = {
	yes: {
		flags: '-y, --yes',
		description: 'do not ask; take the default answers (default: off; ask in a terminal)'
	},
	dryRun: {
		flags: '--dry-run',
		description: 'show the files that would change, write and install nothing (default: off)'
	}
} as const;
