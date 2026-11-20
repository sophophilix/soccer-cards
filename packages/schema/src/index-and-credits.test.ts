import { Ajv2020 } from 'ajv/dist/2020.js';
import { expect, it } from 'vitest';
import creditsSchema from '../schemas/v1/credits.schema.json' with { type: 'json' };
import creditsExample from '../schemas/v1/examples/credits.example.json' with { type: 'json' };
import indexExample from '../schemas/v1/examples/index.example.json' with { type: 'json' };
import indexSchema from '../schemas/v1/index.schema.json' with { type: 'json' };
import playerSchema from '../schemas/v1/player.schema.json' with { type: 'json' };
import committedCreditsTypes from './generated/credits.schema.d.ts?raw';
import committedIndexTypes from './generated/index.schema.d.ts?raw';
import { compileSchemaTypes } from './generate-types.ts';
import { SCHEMA_PATHS, type CreditList, type Discovery } from './index.ts';

const ajv = new Ajv2020({ allErrors: true }).addSchema([playerSchema, indexSchema, creditsSchema]);
const INDEX: Discovery = indexExample;
const CREDIT = (creditsExample satisfies CreditList).credits[0];
const OUTSIDE = 'https://a.example/players.json';
/** The invented index with one collection, changed by the overrides, and its schema. */
const anIndex = (overrides: object, collection: object = {}): readonly [string, object] => [
	'index.schema.json',
	{ ...INDEX, collections: [{ ...INDEX.collections[0], ...collection }], ...overrides }
];
/** A list of copies of the invented credit, changed by the overrides, and its schema. */
const credits = (overrides: object, list: object = {}, length = 1): readonly [string, object] => [
	'credits.schema.json',
	{ credits: Array.from({ length }, () => ({ ...CREDIT, ...overrides })), ...list }
];

it.each([
	['accepts', 'the invented index', anIndex({})],
	['accepts', 'a collection with an item count of 0', anIndex({}, { itemCount: 0 })],
	[
		'accepts',
		'an index with properties it does not know',
		anIndex({ note: 'A' }, { sizeBytes: 1 })
	],
	['refuses', 'a data version of 0', anIndex({ dataVersion: 0 })],
	['refuses', 'a data version of 1.5', anIndex({ dataVersion: 1.5 })],
	['refuses', 'a negative data version', anIndex({ dataVersion: -1 })],
	['refuses', 'a generate time not in UTC', anIndex({ generateTime: '2026-11-16T12:06:57+01:00' })],
	['refuses', 'a list file on another host', anIndex({}, { uri: OUTSIDE })],
	['refuses', 'a list file in a parent folder', anIndex({}, { uri: '../players.json' })],
	['accepts', 'a list of 1,000 credits', credits({}, {}, 1000)],
	['accepts', 'credits with properties they do not know', credits({ widthPx: 1 }, { note: 'A' })],
	['refuses', 'a list of 1,001 credits', credits({}, {}, 1001)],
	['refuses', 'a credit whose player is a club', credits({ player: 'clubs/harbour-rovers' })],
	['refuses', 'a photo on another host', credits({ uri: OUTSIDE })],
	[
		'refuses',
		'a photo source on another host',
		credits({ attribution: { ...CREDIT?.attribution, sourceUri: OUTSIDE } })
	]
])('%s %s', (verdict, _case, [schema, data]) => {
	expect(ajv.validate(schema, data)).toBe(verdict === 'accepts');
});

it.each([
	[SCHEMA_PATHS.index, committedIndexTypes],
	[SCHEMA_PATHS.credits, committedCreditsTypes]
])('the generated types match %s', async (path, committedTypes) => {
	expect(committedTypes).toBe(await compileSchemaTypes(path));
});
