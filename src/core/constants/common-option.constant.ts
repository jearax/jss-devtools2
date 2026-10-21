export const COMMON_OPTIONS = {
	yes: {
		flags: '-y, --yes',
		description: 'do not ask; take the default answers'
	},
	dryRun: {
		flags: '--dry-run',
		description: 'show the changes, write nothing'
	}
} as const;
