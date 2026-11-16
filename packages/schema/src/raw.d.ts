// Vite's `?raw` suffix imports a file's text. The freshness test reads the committed types with it.
declare module '*?raw' {
	const text: string;
	export default text;
}
