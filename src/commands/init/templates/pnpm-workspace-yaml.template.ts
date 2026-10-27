export const pnpmWorkspaceYamlTemplate = (): string => {
	return `allowBuilds:
  esbuild: true
  unrs-resolver: true

strictPeerDependencies: true

engineStrict: true
`;
};

export const pnpmWorkspaceYamlExistingTemplate = (): string => {
	return `allowBuilds:
  esbuild: true
  unrs-resolver: true
`;
};
