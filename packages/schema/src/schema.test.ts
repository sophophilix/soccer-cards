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

/** An invented player with only the fields the schema requires. */
function aPlayer(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: 7,
		name: 'Tavi Brightwell',
		club: 'Harbour Town',
		country: 'ENG',
		position: 'FW',
		tier: 'base',
		ratings: { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, power: 65 },
		playStats: { attack: 74, defence: 50, control: 67 },
		...overrides
	};
}

const withRating = (pace: unknown): Record<string, unknown> =>
	aPlayer({
		ratings: { pace, shooting: 70, passing: 60, dribbling: 75, defending: 40, power: 65 }
	});
const withPlayStat = (attack: unknown): Record<string, unknown> =>
	aPlayer({ playStats: { attack, defence: 50, control: 67 } });

describe('player.schema.json', () => {
	it('accepts a player with no photo, no goals and no awards', () => {
		expect(isValidPlayer(aPlayer())).toBe(true);
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

	it.each(['Zoë Árvíztűrő', "Dara O'Fennick", 'Pelinho'])('accepts the name %s', (name) => {
		expect(isValidPlayer(aPlayer({ name }))).toBe(true);
	});

	it.each([1, 50, 99])('accepts %s as a rating and as a play stat', (value) => {
		expect(isValidPlayer(withRating(value)) && isValidPlayer(withPlayStat(value))).toBe(true);
	});

	it.each([0, 100, 50.5, '50', null])('refuses %s as a rating and as a play stat', (value) => {
		expect(isValidPlayer(withRating(value)) || isValidPlayer(withPlayStat(value))).toBe(false);
	});

	it.each(['id', 'name', 'club', 'country', 'position', 'tier', 'ratings', 'playStats'])(
		'refuses a player with no %s',
		(field) => {
			expect(isValidPlayer(aPlayer({ [field]: undefined }))).toBe(false);
		}
	);

	it.each([
		['a tier outside the three', { tier: 'epic' }],
		['a position outside the three', { position: 'GK' }],
		['an id of zero', { id: 0 }],
		['an empty name', { name: '' }],
		['a country that is not a three-letter code', { country: 'England' }],
		['a missing rating', { ratings: { pace: 80 } }],
		['a missing play stat', { playStats: { attack: 74, defence: 50 } }],
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
		['a list of players', [aPlayer(), aPlayer({ id: 8, tier: 'legend' })]]
	])('accepts %s', (_rule, players) => {
		expect(isValidPlayerList({ players })).toBe(true);
	});

	it.each([
		['no players field', {}],
		['null players', { players: null }],
		['a player with a tier outside the three', { players: [aPlayer({ tier: 'epic' })] }],
		['a player with a rating of 100', { players: [withRating(100)] }]
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
