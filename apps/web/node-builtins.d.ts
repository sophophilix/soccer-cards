// @types/node is not a dependency of this app, so name the functions
// that vite.config.ts uses at build time.
declare module 'node:fs/promises' {
	export function readdir(folder: string, options?: { recursive: true }): Promise<string[]>;
	export function lstat(path: string): Promise<import('./src/lib/data/api-files.ts').EntryStats>;
	export function mkdir(folder: string, options: { recursive: true }): Promise<unknown>;
	export function copyFile(from: string, to: string): Promise<void>;
	export function readFile(file: string, encoding: 'utf8'): Promise<string>;
	export function writeFile(file: string, text: string): Promise<void>;
}
