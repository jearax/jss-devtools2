export type SrcMainTemplateInput = {
	projectName: string;
};

export const srcMainTemplate = ({ projectName }: SrcMainTemplateInput): string => {
	return `export const main = (): void => {
	console.log('Hello from ${projectName}');
};

main();
`;
};
