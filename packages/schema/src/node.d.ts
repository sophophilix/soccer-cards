// Node's own modules, in the forms the type generator and its tests use. `@types/node` is not installed.
declare module 'node:fs/promises' {
	export function mkdtemp(prefix: string): Promise<string>;
	export function readdir(folder: string): Promise<string[]>;
	export function readFile(file: string, encoding: 'utf8'): Promise<string>;
	export function rm(folder: string, options: { recursive: true }): Promise<void>;
	export function writeFile(file: string, text: string): Promise<void>;
}
declare module 'node:http' {
	interface Server {
		on(event: 'connection', listener: () => void): this;
		listen(port: number, host: string, onListening: () => void): this;
		address(): { port: number } | null;
		close(): this;
	}
	type Handler = (request: unknown, response: { end(text: string): unknown }) => void;
	export function createServer(handler: Handler): Server;
}
declare module 'node:os' {
	export function tmpdir(): string;
}
declare module 'node:path' {
	const path: Record<'dirname' | 'join' | 'resolve', (...parts: string[]) => string>;
	export default path;
}
