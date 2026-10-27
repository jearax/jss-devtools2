export const commitlintConfigMjsTemplate = (): string => {
	return `const commitlintConfig = {
	extends: ['@commitlint/config-conventional']
};

export default commitlintConfig;
`;
};
