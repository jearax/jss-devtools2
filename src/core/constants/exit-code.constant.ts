export const ExitCode = {
	ok: 0,
	failure: 1
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];
