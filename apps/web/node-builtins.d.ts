// @types/node is not a dependency of this app, so name the three functions
// that vite.config.ts uses at build time.
declare module 'node:fs/promises' {
	export function readdir(folder: string, options: { recursive: true }): Promise<string[]>;
	export function readFile(file: string, encoding: 'utf8'): Promise<string>;
	export function writeFile(file: string, text: string): Promise<void>;
}
