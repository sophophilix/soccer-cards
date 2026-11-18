import { mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';
import { compileSchemaTypes, writeGeneratedTypes } from './generate-types.ts';

const KIT = '{ "$defs": { "shirt": { "type": "object", "properties": { "size": {} } } } }';
const SECRET = '{ "type": "object", "properties": { "secretToken": { "type": "string" } } }';
const KIT_REF = '"properties": { "shirt": { "$ref": "kit.schema.json#/$defs/shirt" } }';

/** An invented schema folder, removed after the test. A file name may leave the folder. */
async function aSchemaFolder(files: Record<string, string>, name = 'v1-'): Promise<string> {
	const root = await mkdtemp(path.join(tmpdir(), 'schema-'));
	onTestFinished(() => rm(root, { recursive: true }));
	const folder = await mkdtemp(path.join(root, name));
	const texts = Object.entries(files);
	await Promise.all(texts.map(([file, text]) => writeFile(path.join(folder, file), text)));
	return folder;
}

/** Compiles an invented schema beside a listener on this machine that counts its connections. */
async function compile(schema: (uri: string) => string, others: Record<string, string> = {}) {
	const connections: string[] = [];
	const server = createServer((_request, response) => response.end(KIT));
	server.on('connection', () => connections.push('connection'));
	onTestFinished(() => void server.close());
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	const port = typeof address === 'string' ? address : address?.port;
	const uri = `http://127.0.0.1:${String(port)}/kit.schema.json`;
	const folder = await aSchemaFolder({ 'card.schema.json': schema(uri), ...others });
	const types = compileSchemaTypes(path.join(folder, 'card.schema.json'));
	return { uri, result: await types.catch((error: unknown) => String(error)), connections };
}

describe('compileSchemaTypes', () => {
	it.each([
		['at the top', (uri: string) => `{ "$ref": "${uri}#/$defs/shirt" }`],
		['under items', (uri: string) => `{ "items": { "$ref": "${uri}#/$defs/shirt" } }`],
		['under __proto__', (uri: string) => `{ "__proto__": { "$ref": "${uri}#/$defs/shirt" } }`]
	])('names a remote reference %s and makes no request', async (_place, schema) => {
		const { uri, result, connections } = await compile(schema);
		expect([result, connections]).toEqual([expect.stringContaining(uri), []]);
	});

	it.each([
		['outside the folder', '../package.json', '../package.json'],
		['that is not a schema file', 'notes.json', 'notes.json'],
		['that is a schema file outside the folder', '../kit.schema.json', '../kit.schema.json'],
		['outside the folder with encoded dots', '%2e%2e/kit.schema.json', '../kit.schema.json'],
		['outside the folder with an encoded slash', '..%2Fkit.schema.json', '../kit.schema.json']
	])('refuses a reference to a file %s', async (_case, reference, file) => {
		const { result } = await compile(() => `{ "$ref": "${reference}" }`, { [file]: SECRET });
		expect(result).toMatch(/^(?!.*secretToken).*(Unable to resolve|Error opening file).*\.json/s);
	});

	it('refuses a symbolic link that points outside the folder', async () => {
		const card = '{ "$ref": "link.schema.json" }';
		const folder = await aSchemaFolder({ 'card.schema.json': card, '../notes.json': SECRET });
		await symlink(path.join(folder, '../notes.json'), path.join(folder, 'link.schema.json'));
		const result = await compileSchemaTypes(path.join(folder, 'card.schema.json')).catch(String);
		expect(result).toMatch(/^(?!.*secretToken).*Unable to resolve.*link\.schema\.json/s);
	});

	it.each([
		['in a folder with a space and an accent', 'café v1-', 'kit.schema.json', 'kit.schema.json'],
		['with a percent sign in its name', 'v1-', '50%.schema.json', '50%25.schema.json'],
		['with an encoded at sign in its name', 'v1-', 'k@t.schema.json', 'k%40t.schema.json']
	])('resolves a reference to a schema file %s', async (_case, name, file, reference) => {
		const card = `{ "properties": { "shirt": { "$ref": "${reference}#/$defs/shirt" } } }`;
		const folder = await aSchemaFolder({ 'card.schema.json': card, [file]: KIT }, name);
		const types = await compileSchemaTypes(path.join(folder, 'card.schema.json'));
		expect(types).toContain('size?: unknown');
	});

	it.each([
		['a schema file beside the schema', () => `{ ${KIT_REF} }`],
		['a schema file beside a remote $id', (uri: string) => `{ "$id": "${uri}", ${KIT_REF} }`]
	])('resolves a reference to %s and makes no request', async (_case, schema) => {
		const { result, connections } = await compile(schema, { 'kit.schema.json': KIT });
		expect([result, connections]).toEqual([expect.stringContaining('size?: unknown'), []]);
	});
});

describe('writeGeneratedTypes', () => {
	it('writes the types of each schema file and of no other file', async () => {
		const folder = await aSchemaFolder({ 'kit.schema.json': KIT, 'notes.json': SECRET });
		await writeGeneratedTypes(folder, folder);
		const written = [await readdir(folder), await readFile(`${folder}/kit.schema.d.ts`, 'utf8')];
		expect(written).toEqual([
			['kit.schema.d.ts', 'kit.schema.json', 'notes.json'],
			await compileSchemaTypes(`${folder}/kit.schema.json`)
		]);
	});
});
