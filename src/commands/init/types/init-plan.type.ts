import type { PackageManagerName } from '@/commands/init/templates/package-json.template';

export type InitMode = 'create' | 'existing';

export type PlanEntryAction = 'create' | 'update' | 'delete';

export type PlanEntry = {
	action: PlanEntryAction;
	path: string;
	content?: string;
};

export type InitPlan = {
	mode: InitMode;
	targetDir: string;
	entries: readonly PlanEntry[];
};

export type InitPreflight = {
	mode: InitMode;
	targetDir: string;
	projectName: string;
	pm: PackageManagerName;
	pmVersion: string;
	packageJson?: {
		parsed: Record<string, unknown>;
	};
};
