import { describe, expect, it } from 'vitest';
import { lintSchemaDesign } from './design-lint.ts';

const SCHEMAS = import.meta.glob('../schemas/v1/*.json', { eager: true, import: 'default' });
const TEXT = { description: 'An invented field.', type: 'string' };
const RESOURCE_NAME = { ...TEXT, pattern: '^players/[a-z][a-z0-9-]{0,62}$' };

/** An invented schema with one property. */
const withProperty = (name: string, property: object = TEXT): object => ({
	properties: { [name]: property }
});

describe('lintSchemaDesign', () => {
	it.each([
		['name-not-lower-camel-case', 'a run of capitals', 'sourceURI', TEXT],
		['name-not-lower-camel-case', 'a snake case name', 'source_uri', TEXT],
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
		['an empty schema', {}],
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
	it('include the player and the player list', () => {
		expect(Object.keys(SCHEMAS)).toEqual([
			'../schemas/v1/player.schema.json',
			'../schemas/v1/players.schema.json'
		]);
	});

	it.each(Object.entries(SCHEMAS))('%s breaks no design rule', (_file, schema) => {
		expect(lintSchemaDesign(schema)).toEqual([]);
	});
});
