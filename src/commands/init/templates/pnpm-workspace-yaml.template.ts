export const pnpmWorkspaceYamlTemplate = (): string => {
	return `allowBuilds:
  esbuild: true
  unrs-resolver: true

strictPeerDependencies: true

engineStrict: true
`;
};

// Existing mode never adds strictPeerDependencies or engineStrict; create mode writes all four.
export const pnpmWorkspaceYamlExistingTemplate = (): string => {
	return `allowBuilds:
  esbuild: true
  unrs-resolver: true
`;
};
