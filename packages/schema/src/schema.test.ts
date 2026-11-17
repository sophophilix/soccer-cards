import { Ajv2020 } from 'ajv/dist/2020.js';
import { compileFromFile } from 'json-schema-to-typescript';
import { describe, expect, it } from 'vitest';
import playerSchema from '../schemas/v1/player.schema.json' with { type: 'json' };
import playersSchema from '../schemas/v1/players.schema.json' with { type: 'json' };
import committedPlayerTypes from './generated/player.schema.d.ts?raw';
import committedPlayersTypes from './generated/players.schema.d.ts?raw';
import { SCHEMA_PATHS } from './index.ts';

const ajv = new Ajv2020({ allErrors: true }).addSchema(playerSchema).addSchema(playersSchema);
const isValidPlayer = (data: unknown): boolean => ajv.validate('player.schema.json', data);
const isValidPlayerList = (data: unknown): boolean => ajv.validate('players.schema.json', data);

// The same options as the `generate` script in package.json.
const GENERATE_OPTIONS = {
	cwd: 'schemas/v1',
	additionalProperties: false,
	bannerComment: '// Generated from schemas/v1 by `pnpm run generate`. Do not edit by hand.',
	style: { useTabs: true, singleQuote: true, trailingComma: 'none', printWidth: 100 }
} as const;

const SOURCE = { source: 'Invented Football Almanac', asOf: '2026-01-31' };
const OUTFIELD_RATINGS = {
	...{ pace: 80, shooting: 70, passing: 60 },
	...{ dribbling: 75, defending: 40, physical: 65 }
};
const GOALKEEPER_RATINGS = {
	...{ diving: 82, handling: 77, kicking: 61 },
	...{ reflexes: 85, speed: 48, positioning: 79 }
};
const PLAY_STATS = { attack: 74, defence: 50, control: 67 };

/** An invented player with only the fields the schema requires. */
function aPlayer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		name: 'players/tavi-brightwell',
		displayName: 'Tavi Brightwell',
		state: 'ACTIVE',
		nationalTeamCode: 'ENG',
		position: 'FORWARD',
		tier: 'BASE',
		updateTime: '2026-11-16T12:06:57Z',
		outfieldRatings: OUTFIELD_RATINGS,
		playStats: PLAY_STATS,
		...overrides
	};
}

const GOALKEEPER = {
	position: 'GOALKEEPER',
	outfieldRatings: undefined,
	goalkeeperRatings: GOALKEEPER_RATINGS
};

/** One row for each rating and play stat: a valid player, the group and the field. */
const STAT_FIELDS = [
	...Object.keys(OUTFIELD_RATINGS).map((field) => [aPlayer(), 'outfieldRatings', field] as const),
	...Object.keys(GOALKEEPER_RATINGS).map(
		(field) => [aPlayer(GOALKEEPER), 'goalkeeperRatings', field] as const
	),
	...Object.keys(PLAY_STATS).map((field) => [aPlayer(), 'playStats', field] as const),
	...Object.keys(PLAY_STATS).map((field) => [aPlayer(GOALKEEPER), 'playStats', field] as const)
].map(([player, group, field]) => ({ player, group, field, stats: player[group] as object }));
const withEachStatAs = (values: readonly unknown[]): (readonly [string, unknown, object])[] =>
	STAT_FIELDS.flatMap(({ player, group, field, stats }) =>
		values.map(
			(value) =>
				[`${group}.${field}`, value, { ...player, [group]: { ...stats, [field]: value } }] as const
		)
	);

const PROPERTIES: Record<string, object> = {
	...playerSchema.properties,
	...playerSchema.$defs.playerSummary.properties,
	...playerSchema.$defs.outfieldRatings.properties,
	...playerSchema.$defs.goalkeeperRatings.properties
};

describe('player.schema.json', () => {
	it('accepts a retired player with no club, photo, goals or awards', () => {
		expect(isValidPlayer(aPlayer({ state: 'RETIRED' }))).toBe(true);
	});

	it('accepts a player with a photo, goals, a transfer fee and awards', () => {
		const player = aPlayer({
			photo: 'photos/7.webp',
			clubGoals: { goals: 12, ...SOURCE },
			countryGoals: { goals: 0, ...SOURCE },
			transferFee: { amountMinor: 4_200_000_000, currency: 'EUR', ...SOURCE },
			awards: [{ title: 'Harbour Cup winner 2025', ...SOURCE }]
		});
		expect(isValidPlayer(player)).toBe(true);
	});

	it('accepts a field it does not know', () => {
		expect(isValidPlayer(aPlayer({ shirtNumber: 9 }))).toBe(true);
	});

	it.each(['Zoë Árvíztűrő', "Dara O'Fennick", 'Pelinho'])('accepts the display name %s', (name) => {
		expect(isValidPlayer(aPlayer({ displayName: name }))).toBe(true);
	});

	it.each([
		['the name players/ronaldo-1976', { name: 'players/ronaldo-1976' }],
		['a slug of 63 characters', { name: `players/${'a'.repeat(63)}` }],
		['a given name and a family name', { givenName: 'Tavi', familyName: 'Brightwell' }],
		['a club resource name', { club: 'clubs/harbour-town' }],
		['a card number of 1', { cardNumber: 1 }],
		['an update time with a fraction of a second', { updateTime: '2026-11-16T12:06:57.5Z' }]
	])('accepts %s', (_rule, overrides) => {
		expect(isValidPlayer(aPlayer(overrides))).toBe(true);
	});

	it.each([
		['state', 'ACTIVE'],
		['state', 'RETIRED'],
		['position', 'DEFENDER'],
		['position', 'MIDFIELDER'],
		['position', 'FORWARD'],
		['tier', 'BASE'],
		['tier', 'RARE'],
		['tier', 'LEGEND']
	])('accepts the %s %s', (field, value) => {
		expect(isValidPlayer(aPlayer({ [field]: value }))).toBe(true);
	});

	it.each(['state', 'position', 'tier'])('tells a reader how to treat an unknown %s', (field) => {
		expect(PROPERTIES[field]).toHaveProperty('description', expect.stringContaining('unknown'));
	});

	it.each([
		...['name', 'displayName', 'givenName', 'familyName', 'state', 'position', 'tier'],
		...['nationalTeamCode', 'club', 'cardNumber', 'updateTime'],
		...['outfieldRatings', 'goalkeeperRatings', 'physical'],
		...Object.keys(GOALKEEPER_RATINGS)
	])('describes %s', (property) => {
		expect(PROPERTIES[property]).toHaveProperty('description', expect.stringMatching(/\w/));
	});

	it('accepts a goalkeeper with goalkeeper ratings and no outfield ratings', () => {
		expect(isValidPlayer(aPlayer(GOALKEEPER))).toBe(true);
	});

	it.each(withEachStatAs([1, 99]))('accepts %s of %s', (_field, _value, player) => {
		expect(isValidPlayer(player)).toBe(true);
	});

	it.each(withEachStatAs([0, 100, 50.5, '50', null]))(
		'refuses %s of %s',
		(_field, _value, player) => {
			expect(isValidPlayer(player)).toBe(false);
		}
	);

	it.each(withEachStatAs([undefined]))('refuses a player with no %s', (_field, _value, player) => {
		expect(isValidPlayer(player)).toBe(false);
	});

	it.each([
		...['name', 'displayName', 'state', 'nationalTeamCode', 'position', 'tier'],
		...['outfieldRatings', 'playStats', 'updateTime']
	])('refuses a player with no %s', (field) => {
		expect(isValidPlayer(aPlayer({ [field]: undefined }))).toBe(false);
	});

	it.each([
		['a tier outside the three', { tier: 'ICON' }],
		['a lowercase tier', { tier: 'base' }],
		['a position outside the four', { position: 'FW' }],
		['a state outside the two', { state: 'INJURED' }],
		['an unspecified state', { state: 'STATE_UNSPECIFIED' }],
		['a numeric name', { name: 7 }],
		['a name with no collection', { name: 'tavi-brightwell' }],
		['a name in another collection', { name: 'clubs/tavi-brightwell' }],
		['a slug that starts with a digit', { name: 'players/7-brightwell' }],
		['a slug that starts with a hyphen', { name: 'players/-brightwell' }],
		['a slug with a capital letter', { name: 'players/tavi-Brightwell' }],
		['a slug of 64 characters', { name: `players/${'a'.repeat(64)}` }],
		['a name with a second slash', { name: 'players/tavi/brightwell' }],
		['an empty display name', { displayName: '' }],
		['an empty given name', { givenName: '' }],
		['an empty family name', { familyName: '' }],
		['a national team code that is a word', { nationalTeamCode: 'England' }],
		['a national team code in lowercase', { nationalTeamCode: 'eng' }],
		['a club that is a display name', { club: 'Harbour Town' }],
		['a club with a capital letter in its slug', { club: 'clubs/Harbour-town' }],
		['a null club', { club: null }],
		['a card number of zero', { cardNumber: 0 }],
		['a card number with a fraction', { cardNumber: 7.5 }],
		['an update time with an offset of +01:00', { updateTime: '2026-11-16T13:06:57+01:00' }],
		['an update time with an offset of +00:00', { updateTime: '2026-11-16T12:06:57+00:00' }],
		['an update time that is only a day', { updateTime: '2026-11-16' }],
		['a given name with no family name', { givenName: 'Tavi' }],
		['a family name with no given name', { familyName: 'Brightwell' }],
		['a goalkeeper with both rating groups', { ...GOALKEEPER, outfieldRatings: OUTFIELD_RATINGS }],
		['a goalkeeper with outfield ratings only', { position: 'GOALKEEPER' }],
		['a goalkeeper with neither rating group', { ...GOALKEEPER, goalkeeperRatings: undefined }],
		['a forward with both rating groups', { goalkeeperRatings: GOALKEEPER_RATINGS }],
		['a forward with goalkeeper ratings only', { ...GOALKEEPER, position: 'FORWARD' }],
		['a defender with goalkeeper ratings only', { ...GOALKEEPER, position: 'DEFENDER' }],
		['a midfielder with goalkeeper ratings only', { ...GOALKEEPER, position: 'MIDFIELDER' }],
		['the old ratings group only', { outfieldRatings: undefined, ratings: OUTFIELD_RATINGS }],
		['a null photo', { photo: null }],
		['a photo on another host', { photo: 'https://photos.example/7.webp' }],
		['null goals', { clubGoals: null }],
		['null awards', { awards: null }],
		['a null transfer fee', { transferFee: null }],
		['a transfer fee with no currency', { transferFee: { amountMinor: 500, ...SOURCE } }],
		['a transfer fee in major units', { transferFee: { amount: 5, currency: 'EUR', ...SOURCE } }],
		['goals below zero', { countryGoals: { goals: -1, ...SOURCE } }],
		['goals with no source', { clubGoals: { goals: 3, asOf: '2026-01-31' } }],
		['goals with no asOf', { clubGoals: { goals: 3, source: 'Invented Football Almanac' } }],
		['an asOf that is not a date', { clubGoals: { goals: 3, ...SOURCE, asOf: 'last May' } }],
		['an award with no source', { awards: [{ title: 'Harbour Cup winner 2025' }] }]
	])('refuses %s', (_rule, overrides) => {
		expect(isValidPlayer(aPlayer(overrides))).toBe(false);
	});
});

describe('players.schema.json', () => {
	it.each([
		['an empty list', []],
		['a list of players', [aPlayer(), aPlayer({ name: 'players/mira-oakes', tier: 'LEGEND' })]],
		['a summary with both names', [aPlayer({ givenName: 'Tavi', familyName: 'Brightwell' })]],
		['a goalkeeper', [aPlayer(GOALKEEPER)]]
	])('accepts %s', (_rule, players) => {
		expect(isValidPlayerList({ players })).toBe(true);
	});

	it.each([
		['no players field', {}],
		['null players', { players: null }],
		['a player with a tier outside the three', { players: [aPlayer({ tier: 'EPIC' })] }],
		['a player with a numeric id and no name', { players: [aPlayer({ id: 7, name: undefined })] }],
		[
			'a player with a pace of 100',
			{ players: [aPlayer({ outfieldRatings: { ...OUTFIELD_RATINGS, pace: 100 } })] }
		],
		['a goalkeeper with outfield ratings', { players: [aPlayer({ position: 'GOALKEEPER' })] }],
		['a summary with a given name only', { players: [aPlayer({ givenName: 'Tavi' })] }]
	])('refuses %s', (_rule, list) => {
		expect(isValidPlayerList(list)).toBe(false);
	});
});

describe('the generated types', () => {
	it.each([
		[SCHEMA_PATHS.player, committedPlayerTypes],
		[SCHEMA_PATHS.players, committedPlayersTypes]
	])('match %s', async (path, committedTypes) => {
		expect(committedTypes).toBe(await compileFromFile(path, GENERATE_OPTIONS));
	});
});
