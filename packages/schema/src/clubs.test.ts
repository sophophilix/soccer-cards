import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import clubSchema from '../schemas/v1/club.schema.json' with { type: 'json' };
import clubsSchema from '../schemas/v1/clubs.schema.json' with { type: 'json' };
import playerSchema from '../schemas/v1/player.schema.json' with { type: 'json' };
import committedClubTypes from './generated/club.schema.d.ts?raw';
import committedClubsTypes from './generated/clubs.schema.d.ts?raw';
import { compileSchemaTypes } from './generate-types.ts';
import { SCHEMA_PATHS, type Club, type ClubList } from './index.ts';

const ajv = new Ajv2020({ allErrors: true }).addSchema(clubSchema).addSchema(clubsSchema);
const isValidClub = (data: unknown): boolean => ajv.validate('club.schema.json', data);
const isValidClubList = (data: unknown): boolean => ajv.validate('clubs.schema.json', data);

const CLUB: Club = {
	name: 'clubs/harbour-town',
	displayName: 'Harbour Town',
	updateTime: '2026-11-16T12:06:57Z'
};
/** An invented club with only the fields the schema requires. */
const aClub = (overrides: object = {}): object => ({ ...CLUB, ...overrides });
/** A list of invented clubs of a given length. */
const aClubList = (length: number): ClubList => ({
	clubs: Array.from({ length }, () => CLUB)
});

describe('club.schema.json', () => {
	it.each([
		['only the required fields', {}],
		['a country code', { countryCode: 'ENG' }],
		['a name with digits and hyphens', { name: 'clubs/harbour-town-1905' }],
		['an id of 63 characters', { name: `clubs/${'a'.repeat(63)}` }],
		['a display name of 1 character', { displayName: 'A' }],
		['a display name of 60 characters', { displayName: 'a'.repeat(60) }],
		['a display name with accents', { displayName: 'Árvíztűrő Zoë 1905' }],
		['a property it does not know', { foundingYear: 1905 }]
	])('accepts %s', (_rule, overrides) => {
		expect(isValidClub(aClub(overrides))).toBe(true);
	});

	it.each([
		['no name', { name: undefined }],
		['no display name', { displayName: undefined }],
		['no update time', { updateTime: undefined }],
		['an id of 64 characters', { name: `clubs/${'a'.repeat(64)}` }],
		['an id that starts with a digit', { name: 'clubs/1905-harbour' }],
		['an id with an upper-case letter', { name: 'clubs/Harbour-town' }],
		['a name in another collection', { name: 'players/harbour-town' }],
		['an empty display name', { displayName: '' }],
		['a display name of 61 characters', { displayName: 'a'.repeat(61) }],
		['a display name with markup', { displayName: 'Harbour <b>Town</b>' }],
		['a display name that starts with a space', { displayName: ' Harbour Town' }],
		['a display name with a control character', { displayName: 'Harbour\u{0007}Town' }],
		['a display name with a direction override', { displayName: 'Harbour\u{202E}Town' }],
		['a country code in lower case', { countryCode: 'eng' }],
		['a country code of four letters', { countryCode: 'ENGL' }],
		['a null country code', { countryCode: null }],
		['an update time with no zone', { updateTime: '2026-11-16T12:06:57' }]
	])('refuses %s', (_rule, overrides) => {
		expect(isValidClub(aClub(overrides))).toBe(false);
	});

	it('refuses in a display name what a photo author refuses', () => {
		const { pattern } = clubSchema.$defs.club.properties.displayName;
		expect(pattern).toBe(playerSchema.$defs.attribution.properties.author.pattern);
	});
});

describe('clubs.schema.json', () => {
	it.each([
		['an empty list', aClubList(0)],
		['a list of 1,000 clubs', aClubList(1000)]
	])('accepts %s', (_rule, list) => {
		expect(isValidClubList(list)).toBe(true);
	});

	it.each([
		['a list of 1,001 clubs', aClubList(1001)],
		['no clubs field', {}],
		['a club with no update time', { clubs: [aClub({ updateTime: undefined })] }],
		['a club with an id of 64 characters', { clubs: [aClub({ name: `clubs/${'a'.repeat(64)}` })] }]
	])('refuses %s', (_rule, list) => {
		expect(isValidClubList(list)).toBe(false);
	});
});

describe('the generated club types', () => {
	it.each([
		[SCHEMA_PATHS.club, committedClubTypes],
		[SCHEMA_PATHS.clubs, committedClubsTypes]
	])('match %s', async (path, committedTypes) => {
		expect(committedTypes).toBe(await compileSchemaTypes(path));
	});
});
