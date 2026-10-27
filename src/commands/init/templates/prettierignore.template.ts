export const prettierignoreTemplate = (): string => {
	return `node_modules/
dist/
coverage/

package-lock.json
pnpm-lock.yaml
yarn.lock
bun.lock

.env*
.eslintcache
*.log
`;
};
