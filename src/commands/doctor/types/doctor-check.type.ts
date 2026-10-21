import type { GitVersion } from '@/core/adapters/git.adapter';

export type DoctorResult = {
	id: string;
	label: string;
	ok: boolean;
	detail: string;
	note?: string;
	hint?: string;
};

export type GitProbe = {
	version: GitVersion;
	isInsideWorkTree: (cwd: string) => Promise<boolean>;
};

export type DoctorContext = {
	cwd: string;
	nodeVersion: string;
	git: GitProbe;
};

export type DoctorCheck = {
	id: string;
	run: (context: DoctorContext) => DoctorResult | Promise<DoctorResult>;
};
