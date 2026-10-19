export type RunResult = {
	code: number | null;
	stdout: string;
	stderr: string;
};

export const runCommand = (): Promise<RunResult> => {
	return Promise.resolve({
		code: 0,
		stdout: '',
		stderr: ''
	});
};
