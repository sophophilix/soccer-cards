import { describe, expect, it } from 'vitest';
import { lintSchemaDesign } from './design-lint.ts';

// Each file as text: a JSON import would turn a key named `__proto__` into a prototype.
const SCHEMAS = import.meta.glob('../schemas/v1/*.json', { eager: true, query: '?raw' });
const TEXT = { description: 'An invented field.', type: 'string' };
const REMOTE = { $ref: 'https://a.example/x.schema.json#/$defs/a' };
const BAD = { type: 'null', ...REMOTE };
const RESOURCE_NAME = { ...TEXT, pattern: '^players/[a-z][a-z0-9-]{0,62}$' };

/** An invented schema with one property. */
const withProperty = (name: string, property: object = TEXT): object => ({
	properties: { [name]: property }
});

describe('lintSchemaDesign', () => {
	it.each([
		['name-not-lower-camel-case', 'a run of capitals', 'sourceURI', TEXT],
		['name-not-lower-camel-case', 'a snake case name', 'source_uri', TEXT],
		['name-not-lower-camel-case', 'a property named $ref', '$ref', TEXT],
		['name-not-resource-name', 'a name with no pattern', 'name', TEXT],
		['name-not-resource-name', 'a name that is a label', 'name', { ...TEXT, pattern: '^.+$' }],
		['enum-not-upper-snake-case', 'a lowercase value', 'tier', { ...TEXT, enum: ['BASE', 'rare'] }],
		['enum-not-upper-snake-case', 'a number', 'tier', { description: 'A tier.', enum: [1] }],
		[
			'type-allows-null',
			'a null in a list of types',
			'club',
			{ ...TEXT, type: ['string', 'null'] }
		],
		['type-allows-null', 'the null type', 'club', { ...TEXT, type: 'null' }],
		['type-allows-null', 'a null constant', 'club', { description: 'A club.', const: null }],
		['no-description', 'a property with none', 'pace', { type: 'integer' }],
		['no-description', 'a blank description', 'pace', { description: ' ', type: 'integer' }],
		['name-breaks-suffix-rule', 'a plural count', 'goalCounts', TEXT],
		['name-breaks-suffix-rule', 'a count that comes first', 'countOfGoals', TEXT],
		['name-breaks-suffix-rule', 'an is prefix', 'isRetired', TEXT],
		['name-breaks-suffix-rule', 'a num prefix', 'numGoals', TEXT],
		['name-breaks-suffix-rule', 'url at the end', 'photoUrl', TEXT],
		['name-breaks-suffix-rule', 'url alone', 'url', TEXT],
		['name-breaks-suffix-rule', 'urls at the end', 'photoUrls', TEXT],
		['name-breaks-suffix-rule', 'urls alone', 'urls', TEXT],
		['ref-outside-folder', 'a whole file', 'photo', { ...TEXT, $ref: 'x.schema.json' }],
		['ref-outside-folder', 'a reference that is not text', 'photo', { ...TEXT, $ref: 5 }],
		['ref-outside-folder', 'a pointer outside $defs', 'photo', { ...TEXT, $ref: '#/properties/a' }],
		['ref-outside-folder', 'a remote reference', 'photo', { ...TEXT, $ref: 'https://a.example/x' }],
		['ref-outside-folder', 'a parent folder', 'photo', { ...TEXT, $ref: '../x.schema.json#/a' }]
	])('reports %s for %s', (rule, _case, name, property) => {
		const problems = lintSchemaDesign(withProperty(name, property));

		expect(problems).toEqual([{ path: `#/properties/${name}`, rule }]);
	});

	it.each([
		['#/$defs/photo', { $defs: { photo: withProperty('sourceURI') } }],
		['#/properties/photo', withProperty('photo', { ...TEXT, ...withProperty('sourceURI') })],
		['#/allOf/0', { allOf: [withProperty('sourceURI')] }],
		['#/oneOf/1', { oneOf: [{}, withProperty('sourceURI')] }],
		['#/if', { if: withProperty('sourceURI') }],
		['#/then', { then: withProperty('sourceURI') }],
		[
			'#/properties/awards/items',
			withProperty('awards', { ...TEXT, ...{ items: withProperty('sourceURI') } })
		]
	])('walks to a property under %s', (path, schema) => {
		const problems = lintSchemaDesign(schema);

		expect(problems).toEqual([
			{ path: `${path}/properties/sourceURI`, rule: 'name-not-lower-camel-case' }
		]);
	});

	it.each([
		['#/properties/photo', withProperty('photo', { ...TEXT, ...BAD })],
		['#/patternProperties/^x', { patternProperties: { '^x': BAD } }],
		['#/$defs/photo', { $defs: { photo: BAD } }],
		['#/definitions/photo', { definitions: { photo: BAD } }],
		['#/dependentSchemas/photo', { dependentSchemas: { photo: BAD } }],
		['#/allOf/0', { allOf: [BAD] }],
		['#/anyOf/0', { anyOf: [BAD] }],
		['#/oneOf/1', { oneOf: [{}, BAD] }],
		['#/prefixItems/0', { prefixItems: [BAD] }],
		['#/if', { if: BAD }],
		['#/then', { then: BAD }],
		['#/else', { else: BAD }],
		['#/not', { not: BAD }],
		['#/items', { items: BAD }],
		['#/contains', { contains: BAD }],
		['#/additionalProperties', { additionalProperties: BAD }],
		['#/propertyNames', { propertyNames: BAD }],
		['#/unevaluatedProperties', { unevaluatedProperties: BAD }],
		['#/unevaluatedItems', { unevaluatedItems: BAD }],
		['#/contentSchema', { contentSchema: BAD }]
	])('reports a null type and a remote reference at %s', (path, schema) => {
		expect(lintSchemaDesign(schema)).toEqual([
			{ path, rule: 'type-allows-null' },
			{ path, rule: 'ref-outside-folder' }
		]);
	});

	it.each([
		['#/examples/0', { examples: [REMOTE] }],
		['#/default/photo', { default: { photo: REMOTE } }],
		['#/properties/photo/examples/1', withProperty('photo', { ...TEXT, examples: ['a', REMOTE] })],
		['#/properties', { properties: REMOTE }],
		['#/$defs', { $defs: REMOTE }],
		['#/__proto__', JSON.parse('{ "__proto__": { "$ref": "https://a.example/x" } }') as object],
		['#/items', { items: { $ref: 'shared.yaml#/$defs/a' } }],
		['#/items', { items: { $ref: '../x.schema.json#/$defs/a' } }]
	])('reports a reference that leaves the folder at %s', (path, schema) => {
		expect(lintSchemaDesign(schema)).toEqual([{ path, rule: 'ref-outside-folder' }]);
	});

	it.each([
		['an empty schema', {}],
		['true and false in place of a schema', { items: true, not: false, properties: true }],
		['a true property and a false one', { properties: { photo: true }, allOf: [false] }],
		['a property named items', withProperty('items', { ...TEXT, items: TEXT })],
		['a local reference in an example', { examples: [{ $ref: '#/$defs/photo' }] }],
		['a test under not', { not: withProperty('name', { const: 'players/tavi' }) }],
		['a schema that is not an object', true],
		[
			'a code in a pattern and an example',
			withProperty('nationalTeamCode', { ...TEXT, pattern: '^[A-Z]{3}$', examples: ['eng'] })
		],
		[
			'a constant that is not an enumeration',
			withProperty('mimeType', { description: 'The media type.', const: 'image/webp' })
		],
		[
			'a test on a property in a condition',
			{ if: withProperty('name', { const: 'players/tavi' }) }
		],
		[
			'a resource, its fields and local references',
			{
				properties: {
					name: RESOURCE_NAME,
					displayName: TEXT,
					clubGoalCount: { description: 'Goals for clubs.', type: 'integer' },
					country: TEXT,
					tier: { description: 'How rare the card is.', enum: ['BASE', 'ULTRA_RARE'] },
					photo: { description: 'The photo.', $ref: '#/$defs/photo' },
					club: { description: 'The club.', $ref: 'club.schema.json#/$defs/clubSummary' }
				},
				$defs: { photo: withProperty('sourceUri'), widthPx: { type: 'integer' } }
			}
		]
	])('reports nothing for %s', (_case, schema) => {
		expect(lintSchemaDesign(schema)).toEqual([]);
	});
});

describe('the schemas in schemas/v1', () => {
	it('include the club, the edition, the player, their lists, the index and the credits', () => {
		expect(Object.keys(SCHEMAS)).toEqual([
			'../schemas/v1/club.schema.json',
			'../schemas/v1/clubs.schema.json',
			'../schemas/v1/credits.schema.json',
			'../schemas/v1/edition.schema.json',
			'../schemas/v1/editions.schema.json',
			'../schemas/v1/index.schema.json',
			'../schemas/v1/player.schema.json',
			'../schemas/v1/players.schema.json'
		]);
	});

	it.each(Object.entries(SCHEMAS))('%s breaks no design rule', (_file, { default: text }) => {
		expect(lintSchemaDesign(JSON.parse(text))).toEqual([]);
	});
});
