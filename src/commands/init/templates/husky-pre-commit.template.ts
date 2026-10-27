export type HuskyHookTemplateInput = {
	command: string;
};

export const huskyPreCommitTemplate = ({ command }: HuskyHookTemplateInput): string => {
	return `#!/usr/bin/env sh
${command}
`;
};
