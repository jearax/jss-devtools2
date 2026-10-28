import type { GitVersion } from '@/core/adapters/git.adapter';
import type { PackageManagerName } from '@/core/adapters/package-manager.adapter';
import type { CheckStatus } from '@/core/ui/check-list.ui';

export type DoctorResult = {
	id: string;
	label: string;
	status: CheckStatus;
	detail: string;
	note?: string;
	hint?: string;
};

export type GitProbe = {
	version: GitVersion;
};

export type PackageManagerProbe = {
	version: (pm: PackageManagerName) => Promise<string | null>;
};

export type DoctorContext = {
	nodeVersion: string;
	git: GitProbe;
	pm: PackageManagerProbe;
};

export type DoctorCheck = {
	id: string;
	run: (context: DoctorContext) => readonly DoctorResult[] | Promise<readonly DoctorResult[]>;
};
