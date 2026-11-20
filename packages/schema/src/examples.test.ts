import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import clubSchema from '../schemas/v1/club.schema.json' with { type: 'json' };
import creditsSchema from '../schemas/v1/credits.schema.json' with { type: 'json' };
import editionSchema from '../schemas/v1/edition.schema.json' with { type: 'json' };
import indexSchema from '../schemas/v1/index.schema.json' with { type: 'json' };
import playerSchema from '../schemas/v1/player.schema.json' with { type: 'json' };

// Every file in the folder, as text, so a new example is checked without a change here.
const EXAMPLES = import.meta.glob('../schemas/v1/examples/*', { eager: true, query: '?raw' });
const { $defs, properties } = playerSchema;
const FIELDS = Object.keys({ ...$defs.playerSummary.properties, ...properties }).sort();
const ajv = new Ajv2020({ allErrors: true });
// The first part of a file's name selects its schema: `club.example.json` is a club.
const VALIDATORS = new Map([
	['player', ajv.compile(playerSchema)],
	['club', ajv.compile(clubSchema)],
	['edition', ajv.compile(editionSchema)],
	['index', ajv.compile(indexSchema)],
	['credits', ajv.compile(creditsSchema)]
]);
const kindOf = (file: string): string => file.split('/').at(-1)?.split('.')[0] ?? '';
const CLUB = '../schemas/v1/examples/club.example.json';
const EDITION = '../schemas/v1/examples/edition.example.json';
const OUTFIELD = '../schemas/v1/examples/player.outfield.json';
const PLAYERS = Object.fromEntries(
	Object.entries(EXAMPLES).filter(([file]) => kindOf(file) === 'player')
);

/** Why a file fails the schema its name selects, with the file's name. Empty when it passes. */
function failureOf(file: string, text: string): string[] {
	const validate = VALIDATORS.get(kindOf(file));
	if (validate === undefined) return [`${file}: its name selects no schema`];
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch (error) {
		return [`${file}: not valid JSON: ${String(error)}`];
	}
	return validate(value) ? [] : [`${file}: ${ajv.errorsText(validate.errors)}`];
}

/** The files that fail their schema, each with its reason. An empty folder fails too. */
function failuresIn(files: Readonly<Record<string, { default: string }>>): string[] {
	const failures = Object.entries(files).flatMap(([file, raw]) => failureOf(file, raw.default));
	return Object.keys(files).length === 0 ? ['no examples found'] : failures;
}

/** The schema's fields that none of the files carries. */
function fieldsMissingFrom(files: Readonly<Record<string, { default: string }>>): string[] {
	const used = Object.values(files).flatMap((raw) =>
		Object.keys(JSON.parse(raw.default) as object)
	);
	return FIELDS.filter((field) => !used.includes(field));
}

describe('the examples beside the schemas', () => {
	it('all pass the schema their name selects', () => {
		expect(failuresIn(EXAMPLES)).toEqual([]);
	});

	it('include an index and a credits list', () => {
		const kinds = Object.keys(EXAMPLES).map(kindOf);
		expect(kinds).toEqual(expect.arrayContaining(['index', 'credits']));
	});

	it('include a club that uses every field', () => {
		const club = JSON.parse(EXAMPLES[CLUB]?.default ?? '{}') as object;
		expect(Object.keys(club)).toEqual(Object.keys(clubSchema.$defs.club.properties));
	});

	it('include an edition that uses every field', () => {
		const edition = JSON.parse(EXAMPLES[EDITION]?.default ?? '{}') as object;
		expect(Object.keys(edition)).toEqual(Object.keys(editionSchema.$defs.edition.properties));
	});

	it.each([
		['a club named as a player', 'player.club.json', CLUB, /^player\.club\.json: .*required/],
		['a player named as a club', 'club.player.json', OUTFIELD, /^club\.player\.json: .*pattern/],
		['a club named as an edition', 'edition.club.json', CLUB, /^edition\.club\.json: .*required/],
		['a club named as an index', 'index.club.json', CLUB, /^index\.club\.json: .*required/],
		['a club named as credits', 'credits.club.json', CLUB, /^credits\.club\.json: .*required/],
		['a file with no schema', 'league.example.json', CLUB, /^league\.example\.json: .*no schema$/],
		[
			'a file named from the prototype chain',
			'constructor.json',
			CLUB,
			/^constructor\.json: .*no schema$/
		]
	])('%s is named', (_fault, file, example, reason) => {
		const failures = failuresIn({ [file]: EXAMPLES[example] ?? { default: '' } });
		expect(failures).toEqual([expect.stringMatching(reason)]);
	});

	it('the players between them use every field', () => {
		expect(fieldsMissingFrom(PLAYERS)).toEqual([]);
	});

	// An active player has no end year, and a retired player has no club.
	it.each([
		['outfield', 'ACTIVE', ['careerEndYear', 'goalkeeperRatings']],
		['goalkeeper', 'RETIRED', ['club', 'outfieldRatings']]
	])('the %s player is %s and uses every field that fits', (kind, state, unfit) => {
		const text = EXAMPLES[`../schemas/v1/examples/player.${kind}.json`]?.default ?? '{}';
		const example = JSON.parse(text) as { state?: string };
		expect(example.state).toBe(state);
		expect([...Object.keys(example), ...unfit].sort()).toEqual(FIELDS);
	});

	it('one example is an Icon', () => {
		const tiers = Object.values(PLAYERS).map(
			(raw) => (JSON.parse(raw.default) as { tier?: string }).tier
		);
		expect(tiers).toContain('ICON');
	});

	it('a field that no example carries is named', () => {
		const missing = fieldsMissingFrom({ [OUTFIELD]: EXAMPLES[OUTFIELD] ?? { default: '{}' } });
		expect(missing).toEqual(['careerEndYear', 'goalkeeperRatings']);
	});

	it.each([
		['fails the schema', '{ "tier": "GOLD" }', /^player\.bad\.json: .*tier/],
		["isn't valid JSON", '{ "tier": ', /^player\.bad\.json: not valid JSON/],
		["isn't an object", '[]', /^player\.bad\.json: .*must be object/]
	])('a file that %s is named', (_fault, text, reason) => {
		const failures = failuresIn({ ...EXAMPLES, 'player.bad.json': { default: text } });
		expect(failures).toEqual([expect.stringMatching(reason)]);
	});

	it('an empty folder fails', () => {
		expect(failuresIn({})).toEqual(['no examples found']);
	});
});
