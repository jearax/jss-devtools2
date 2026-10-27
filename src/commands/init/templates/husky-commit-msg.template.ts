export type HuskyHookTemplateInput = {
	command: string;
};

export const huskyCommitMsgTemplate = ({ command }: HuskyHookTemplateInput): string => {
	return `#!/usr/bin/env sh
${command}
`;
};
