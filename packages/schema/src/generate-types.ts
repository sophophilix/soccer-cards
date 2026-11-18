import { lstatSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { compileFromFile } from 'json-schema-to-typescript';

const SCHEMA_SUFFIX = '.schema.json';
const BANNER = '// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.';

/** Decodes an address into the file path that the reference parser's own file resolver reads. */
function toFilePath(url: string): string {
	return decodeURI(url).replace(/%(23|24|26|2C|40)/g, (_code, hex: string) =>
		String.fromCharCode(Number.parseInt(hex, 16))
	);
}

/** Compiles one schema file to TypeScript types. It reads only schema files beside that file. */
export async function compileSchemaTypes(schemaPath: string): Promise<string> {
	const folder = path.resolve(path.dirname(schemaPath));
	// A link could point outside the folder, so only a plain file is read.
	const isLink = (file: string): boolean =>
		lstatSync(file, { throwIfNoEntry: false })?.isSymbolicLink() ?? false;
	const isBesideSchema = ({ url }: { url: string }): boolean => {
		const file = toFilePath(url);
		return path.dirname(file) === folder && file.endsWith(SCHEMA_SUFFIX) && !isLink(file);
	};
	if (isLink(schemaPath)) {
		throw new Error(`Refused to read a symbolic link as a schema file: ${schemaPath}`);
	}
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
