export type VscodeSettingsJsonTemplateInput = {
	packageManager: string;
};

export const vscodeSettingsJsonTemplate = ({ packageManager }: VscodeSettingsJsonTemplateInput): string => {
	return `{
	"editor.defaultFormatter": "esbenp.prettier-vscode",
	"editor.formatOnSave": true,
	"editor.codeActionsOnSave": {
		"source.fixAll.eslint": "explicit",
		"source.organizeImports": "never"
	},
	"prettier.requireConfig": true,
	"eslint.validate": ["javascript", "typescript"],
	"js/ts.tsdk.path": "node_modules/typescript/lib",
	"js/ts.tsdk.promptToUseWorkspaceVersion": true,
	"npm.packageManager": "${packageManager}"
}
`;
};
