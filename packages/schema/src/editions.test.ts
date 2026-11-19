import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import clubSchema from '../schemas/v1/club.schema.json' with { type: 'json' };
import editionSchema from '../schemas/v1/edition.schema.json' with { type: 'json' };
import editionsSchema from '../schemas/v1/editions.schema.json' with { type: 'json' };
import committedEditionTypes from './generated/edition.schema.d.ts?raw';
import committedEditionsTypes from './generated/editions.schema.d.ts?raw';
import { compileSchemaTypes } from './generate-types.ts';
import { SCHEMA_PATHS, type Edition, type EditionList } from './index.ts';

const ajv = new Ajv2020({ allErrors: true }).addSchema(editionSchema).addSchema(editionsSchema);
const isValidEdition = (data: unknown): boolean => ajv.validate('edition.schema.json', data);
const isValidEditionList = (data: unknown): boolean => ajv.validate('editions.schema.json', data);

const EDITION: Edition = {
	name: 'editions/summer-2026',
	displayName: 'Summer 2026',
	year: 2026,
	updateTime: '2026-11-16T12:06:57Z'
};
/** An invented edition with only the fields the schema requires. */
const anEdition = (overrides: object = {}): object => ({ ...EDITION, ...overrides });
/** A list of invented editions of a given length. */
const anEditionList = (length: number): EditionList => ({
	editions: Array.from({ length }, () => EDITION)
});

describe('edition.schema.json', () => {
	it.each([
		['only the required fields', {}],
		['a year of 1900', { year: 1900 }],
		['a year of 2100', { year: 2100 }],
		['an id of 63 characters', { name: `editions/${'a'.repeat(63)}` }],
		['a display name of 60 characters', { displayName: 'a'.repeat(60) }],
		['a display name with accents', { displayName: 'Été 2026' }],
		['a property it does not know', { cardCount: 300 }]
	])('accepts %s', (_rule, overrides) => {
		expect(isValidEdition(anEdition(overrides))).toBe(true);
	});

	it.each([
		['no name', { name: undefined }],
		['no display name', { displayName: undefined }],
		['no year', { year: undefined }],
		['no update time', { updateTime: undefined }],
		['a year of 1899', { year: 1899 }],
		['a year of 2101', { year: 2101 }],
		['a year of 2026.5', { year: 2026.5 }],
		['a year as text', { year: '2026' }],
		['an id of 64 characters', { name: `editions/${'a'.repeat(64)}` }],
		['an id that starts with a digit', { name: 'editions/2026' }],
		['a name in another collection', { name: 'clubs/summer-2026' }],
		['an empty display name', { displayName: '' }],
		['a display name of 61 characters', { displayName: 'a'.repeat(61) }],
		['a display name with markup', { displayName: 'Summer <b>2026</b>' }],
		['a display name with a direction override', { displayName: 'Summer\u{202E}2026' }],
		['an update time with no zone', { updateTime: '2026-11-16T12:06:57' }]
	])('refuses %s', (_rule, overrides) => {
		expect(isValidEdition(anEdition(overrides))).toBe(false);
	});

	it('holds a display name and an id to the rules of a club', () => {
		const { name, displayName } = editionSchema.$defs.edition.properties;
		const club = clubSchema.$defs.club.properties;
		expect([displayName, name.pattern]).toEqual([
			{ ...club.displayName, description: displayName.description },
			club.name.pattern.replace('clubs', 'editions')
		]);
	});
});

describe('editions.schema.json', () => {
	it.each([
		['an empty list', anEditionList(0)],
		['a list of 1,000 editions', anEditionList(1000)]
	])('accepts %s', (_rule, list) => {
		expect(isValidEditionList(list)).toBe(true);
	});

	it.each([
		['a list of 1,001 editions', anEditionList(1001)],
		['no editions field', {}],
		['an edition with no year', { editions: [anEdition({ year: undefined })] }]
	])('refuses %s', (_rule, list) => {
		expect(isValidEditionList(list)).toBe(false);
	});
});

describe('the generated edition types', () => {
	it.each([
		[SCHEMA_PATHS.edition, committedEditionTypes],
		[SCHEMA_PATHS.editions, committedEditionsTypes]
	])('match %s', async (path, committedTypes) => {
		expect(committedTypes).toBe(await compileSchemaTypes(path));
	});
});
