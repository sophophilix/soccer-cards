import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compileFromFile } from 'json-schema-to-typescript';

const SCHEMA_SUFFIX = '.schema.json';
const BANNER = '// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.';

/** Compiles one schema file to TypeScript types. It reads only schema files beside that file. */
export function compileSchemaTypes(schemaPath: string): Promise<string> {
	const folder = path.resolve(path.dirname(schemaPath));
	const isBesideSchema = ({ url }: { url: string }): boolean =>
		path.dirname(url) === folder && url.endsWith(SCHEMA_SUFFIX);
	return compileFromFile(schemaPath, {
		additionalProperties: false,
		bannerComment: BANNER,
		style: { useTabs: true, singleQuote: true, trailingComma: 'none', printWidth: 100 },
		// The security floor: generation makes no request and reads no other file, whatever a `$ref` says.
		$refOptions: { resolve: { http: false, file: { canRead: isBesideSchema } } }
	});
}

/** Compiles every schema file in a folder and writes each one's types into another folder. */
export async function writeGeneratedTypes(schemaFolder: string, typeFolder: string): Promise<void> {
	const files = (await readdir(schemaFolder)).filter((file) => file.endsWith(SCHEMA_SUFFIX));
	for (const file of files) {
		const types = await compileSchemaTypes(path.join(schemaFolder, file));
		await writeFile(path.join(typeFolder, file.replace(/json$/, 'd.ts')), types);
	}
}
