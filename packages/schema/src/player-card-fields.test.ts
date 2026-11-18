import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import playerSchema from '../schemas/v1/player.schema.json' with { type: 'json' };
import playersSchema from '../schemas/v1/players.schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true }).addSchema(playerSchema).addSchema(playersSchema);
const PLAY_STATS = { attack: 74, defence: 50, control: 67, overall: 84 };
const SUMMARY_PROPERTIES: Record<string, object> = playerSchema.$defs.playerSummary.properties;
const PLAY_STATS_PROPERTIES: Record<string, object> = playerSchema.$defs.playStats.properties;

/** An invented player summary with only the fields the schema requires. */
function aSummary(overrides: object = {}): Record<string, unknown> {
	return {
		name: 'players/tavi-brightwell',
		displayName: 'Tavi Brightwell',
		state: 'RETIRED',
		nationalTeamCode: 'ENG',
		position: 'FORWARD',
		tier: 'ICON',
		outfieldRatings: {
			...{ pace: 80, shooting: 70, passing: 60 },
			...{ dribbling: 75, defending: 40, physical: 65 }
		},
		playStats: PLAY_STATS,
		...overrides
	};
}
const withOverall = (overall: unknown): object => ({ playStats: { ...PLAY_STATS, overall } });

/** Each kind of file, with a check that takes a summary's overrides and says if the file passes. */
const FILES = [
	[
		'a player',
		(overrides: object): boolean =>
			ajv.validate(
				'player.schema.json',
				aSummary({ updateTime: '2026-11-18T09:00:00Z', ...overrides })
			)
	],
	[
		'a player summary',
		(overrides: object): boolean =>
			ajv.validate('players.schema.json', { players: [aSummary(overrides)] })
	]
] as const;

describe.each(FILES)('the card fields of %s', (_file, isValid) => {
	it.each([
		['the tier ICON', { tier: 'ICON' }],
		['the tier BASE', { tier: 'BASE' }],
		['the tier RARE', { tier: 'RARE' }],
		['the tier LEGEND', { tier: 'LEGEND' }],
		['an overall of 1', withOverall(1)],
		['an overall of 99', withOverall(99)],
		['no card title', { cardTitle: undefined }],
		['the card title Magician', { cardTitle: 'Magician' }],
		['a card title of 1 character', { cardTitle: 'M' }],
		['a card title of 30 characters', { cardTitle: 'a'.repeat(30) }],
		['a card title with an accent and a space', { cardTitle: 'El Niño' }]
	])('accept %s', (_rule, overrides) => {
		expect(isValid(overrides)).toBe(true);
	});

	it.each([
		['a tier in lower case', { tier: 'icon' }],
		['a tier outside the four', { tier: 'EPIC' }],
		['no overall', withOverall(undefined)],
		['an overall of 0', withOverall(0)],
		['an overall of 100', withOverall(100)],
		['an overall of 84.5', withOverall(84.5)],
		['an overall that is a string', withOverall('84')],
		['a null overall', withOverall(null)],
		['an empty card title', { cardTitle: '' }],
		['a card title of 31 characters', { cardTitle: 'a'.repeat(31) }],
		['a card title of spaces only', { cardTitle: '   ' }],
		['a card title of a no-break space only', { cardTitle: ' ' }],
		['a card title with a tag', { cardTitle: '<b>Magician</b>' }],
		['a card title with an opening bracket', { cardTitle: 'Magic <3' }],
		['a card title with a closing bracket', { cardTitle: 'Magic > all' }],
		['a card title with a line break', { cardTitle: 'Magic\nman' }],
		['a card title with a control character', { cardTitle: 'Magic\u0085man' }],
		['a card title with a direction override', { cardTitle: 'Magic‮nam' }],
		['a card title with a direction isolate', { cardTitle: 'Magic⁦man' }],
		['a card title that is a number', { cardTitle: 10 }],
		['a null card title', { cardTitle: null }]
	])('refuse %s', (_rule, overrides) => {
		expect(isValid(overrides)).toBe(false);
	});
});

describe('the descriptions of the card fields', () => {
	it('describes overall', () => {
		expect(PLAY_STATS_PROPERTIES.overall).toHaveProperty(
			'description',
			expect.stringMatching(/\w/)
		);
	});

	it.each(['The project writes it', 'not a sourced fact', 'plain text'])(
		'says of the card title: %s',
		(words) => {
			expect(SUMMARY_PROPERTIES.cardTitle).toHaveProperty(
				'description',
				expect.stringContaining(words)
			);
		}
	);
});
