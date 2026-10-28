export const COMMON_OPTIONS = {
	yes: {
		flags: '--yes, -y',
		description: 'Skip the questions and use the defaults (asks in a terminal; default: off)'
	},
	dryRun: {
		flags: '--dry-run',
		description: 'Show what would change; write and install nothing (default: off)'
	}
} as const;
