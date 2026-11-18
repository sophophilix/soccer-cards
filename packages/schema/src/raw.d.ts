// Vite's `?raw` suffix imports a file's text. The freshness test reads the committed types with it.
declare module '*?raw' {
	const text: string;
	export default text;
}

// Vite's `import.meta.glob`, in the one form the design lint test uses to read every schema.
interface ImportMeta {
	glob(files: string, options: { eager: true; query: '?raw' }): Record<string, { default: string }>;
}
