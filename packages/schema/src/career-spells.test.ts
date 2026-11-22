import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import playerSchema from '../schemas/v1/player.schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true });
const validate = ajv.compile(playerSchema);
const FACT = {
	sourceUri: 'https://almanac.example/players/tavi-brightwell',
	retrieveDate: '2026-11-01'
};
const RATINGS = { pace: 80, shooting: 70, passing: 60, dribbling: 75, defending: 40, physical: 65 };

/** An invented spell with only the fields the schema requires. */
function aSpell(overrides: object = {}): Record<string, unknown> {
	return { club: 'clubs/harbour-rovers', startYear: 2017, ...overrides };
}

/** An invented player, with career spells when given. */
function aPlayer(overrides: object = {}): Record<string, unknown> {
	return {
		name: 'players/tavi-brightwell',
		displayName: 'Tavi Brightwell',
		state: 'RETIRED',
		nationalTeamCode: 'ENG',
		position: 'FORWARD',
		tier: 'ICON',
		outfieldRatings: RATINGS,
		playStats: { attack: 74, defence: 50, control: 67, overall: 84 },
		updateTime: '2026-11-18T09:00:00Z',
		...overrides
	};
}
const withSpells = (careerSpells: unknown): Record<string, unknown> => aPlayer({ careerSpells });

describe('the career spells of a player', () => {
	it.each([
		['a spell with only a club and a start year', [aSpell()]],
		['a spell with an end year', [aSpell({ endYear: 2022 })]],
		[
			'a spell with counts',
			[aSpell({ appearanceCount: { value: 140, ...FACT }, goalCount: { value: 0, ...FACT } })]
		],
		[
			'an ended spell then a current spell',
			[aSpell({ endYear: 2022 }), aSpell({ club: 'clubs/dunmore-united', startYear: 2022 })]
		],
		['the first year, 1850', [aSpell({ startYear: 1850 })]],
		['the last year, 2100', [aSpell({ startYear: 2100 })]],
		// The schema can't compare two fields. The pipeline refuses this (T-0142).
		['an end year before the start year', [aSpell({ startYear: 2020, endYear: 2010 })]]
	])('accept %s', (_rule, spells) => {
		expect(validate(withSpells(spells))).toBe(true);
	});

	it('accepts a player with no career spells field', () => {
		expect(validate(aPlayer())).toBe(true);
	});

	it.each([
		['an empty list', []],
		['a list that is not an array', aSpell()],
		['a club in capitals', [aSpell({ club: 'clubs/Harbour' })]],
		['a club without the clubs/ prefix', [aSpell({ club: 'harbour-rovers' })]],
		['a club starting with a digit', [aSpell({ club: 'clubs/1fc' })]],
		['a spell with no club', [{ startYear: 2017 }]],
		['a spell with no start year', [{ club: 'clubs/harbour-rovers' }]],
		['a start year of 1849', [aSpell({ startYear: 1849 })]],
		['a start year of 2101', [aSpell({ startYear: 2101 })]],
		['an end year of 2101', [aSpell({ endYear: 2101 })]],
		['a start year with a fraction', [aSpell({ startYear: 2017.5 })]],
		['a start year as a string', [aSpell({ startYear: '2017' })]],
		['an extra property', [aSpell({ loanFee: 1 })]],
		['an appearance count as a bare number', [aSpell({ appearanceCount: 140 })]],
		['a goal count as a bare number', [aSpell({ goalCount: 48 })]],
		['a negative goal count', [aSpell({ goalCount: { value: -1, ...FACT } })]],
		['an appearance count with no source', [aSpell({ appearanceCount: { value: 3 } })]]
	])('refuse %s', (_rule, spells) => {
		expect(validate(withSpells(spells))).toBe(false);
	});
});
