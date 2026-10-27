export const pnpmWorkspaceYamlTemplate = (): string => {
	return `allowBuilds:
  unrs-resolver: true

strictPeerDependencies: true

engineStrict: true
`;
};
