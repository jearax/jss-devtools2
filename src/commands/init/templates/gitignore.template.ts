export const gitignoreTemplate = (): string => {
	return `node_modules/

dist/
coverage/
*.tsbuildinfo

*.log
pnpm-debug.log*

.env*
!.env.example

.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/
*.swp
*.swo

.DS_Store
Thumbs.db

.eslintcache
.cache/
`;
};
