import type { PackageManagerName } from '@/commands/init/templates/package-json.template';

export type InitFramework = 'node' | 'react' | 'rn' | 'next' | 'nest';

export type InitOptions = {
	yes?: true;
	dryRun?: true;
	pm?: PackageManagerName;
	force?: true;
	framework?: InitFramework;
	vscode?: boolean;
};
