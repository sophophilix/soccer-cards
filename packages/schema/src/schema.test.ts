import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import playerSchema from '../schemas/v1/player.schema.json' with { type: 'json' };
import playersSchema from '../schemas/v1/players.schema.json' with { type: 'json' };
import committedPlayerTypes from './generated/player.schema.d.ts?raw';
import committedPlayersTypes from './generated/players.schema.d.ts?raw';
import { compileSchemaTypes } from './generate-types.ts';
import { SCHEMA_PATHS } from './index.ts';

const ajv = new Ajv2020({ allErrors: true }).addSchema(playerSchema).addSchema(playersSchema);
const isValidPlayer = (data: unknown): boolean => ajv.validate('player.schema.json', data);
const isValidPlayerList = (data: unknown): boolean => ajv.validate('players.schema.json', data);

const SOURCED = { sourceUri: 'https://almanac.example/tavi', retrieveDate: '2026-01-31' };
const COMMONS = 'https://commons.wikimedia.org/wiki/File:';
const SITE = 'https://almanac.example/';
const CREDIT = { author: 'Ina Vented', licenseCode: 'CC-BY-4.0', sourceUri: `${COMMONS}Tavi.jpg` };
const PHOTO = { uri: 'photos/tavi.webp', widthPx: 600, heightPx: 800, mimeType: 'image/webp' };
const FACTS = {
	clubGoalCount: { value: 12, ...SOURCED },
	nationalTeamGoalCount: { value: 0, ...SOURCED },
	transferFee: { currencyCode: 'EUR', units: 42_000_000, nanos: 0, ...SOURCED },
	awards: [{ displayName: 'Harbour Cup winner 2025', ...SOURCED }],
	photo: { ...PHOTO, attribution: CREDIT }
};
/** The facts with the value at a dotted path replaced. A path goes into every item of a list. */
function facts(path: string, value: unknown, node: unknown = FACTS): object {
	const [key = '', ...rest] = path.split('.');
	if (Array.isArray(node)) return node.map((item) => facts(path, value, item));
	const fields = node as Record<string, unknown>;
	return { ...fields, [key]: rest.length > 0 ? facts(rest.join('.'), value, fields[key]) : value };
}
const FACT_FIELDS = Object.entries({ ...FACTS, 'photo.attribution': CREDIT }).flatMap(
	([kind, fact]) => Object.keys([fact].flat()[0] ?? {}).map((field) => `${kind}.${field}`)
);
const source = (uri: string): object => facts('awards.sourceUri', uri);
const photoSource = (uri: string): object => facts('photo.attribution.sourceUri', uri);
const author = (text: string): object => facts('photo.attribution.author', text);
const licences = (rule: string, codes: string): [string, object][] =>
	codes.split(' ').map((code) => [`${rule} ${code}`, facts('photo.attribution.licenseCode', code)]);
const OUTFIELD_RATINGS = {
	...{ pace: 80, shooting: 70, passing: 60 },
	...{ dribbling: 75, defending: 40, physical: 65 }
};
const GOALKEEPER_RATINGS = {
	...{ diving: 82, handling: 77, kicking: 61 },
	...{ reflexes: 85, speed: 48, positioning: 79 }
};
const PLAY_STATS = { attack: 74, defence: 50, control: 67, overall: 84 };

/** An invented player with only the fields the schema requires. */
function aPlayer(overrides: object = {}): Record<string, unknown> {
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
			...{ ...FACTS, careerStartYear: 2019, careerEndYear: 2026 }
		});
		expect(isValidPlayer(player)).toBe(true);
	});

	describe.each([undefined, null])('with a field of a fact set to %s', (value) => {
		it.each(FACT_FIELDS)('refuses %s', (path) => {
			expect(isValidPlayer(aPlayer(facts(path, value)))).toBe(false);
		});
	});

	it.each(
		(['sourced', 'goalCount', 'transferFee', 'award', 'photo', 'attribution'] as const).flatMap(
			(def) => Object.entries<object>(playerSchema.$defs[def].properties)
		)
	)('describes %s', (_field, property) => {
		expect(property).toHaveProperty('description', expect.stringMatching(/\w/));
	});

	it('says that a retrieve date is not checked against the calendar', () => {
		const { description } = playerSchema.$defs.sourced.properties.retrieveDate;
		expect(description).toContain('2026-02-30');
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
		['an update time with a fraction of a second', { updateTime: '2026-11-16T12:06:57.5Z' }],
		['nanos of 999,999,999', facts('transferFee.nanos', 999_999_999)],
		['a retrieve date of 2026-02-30', facts('awards.retrieveDate', '2026-02-30')],
		['a source with a port', source('https://almanac.example:8443/tavi')],
		['a source with a query and a fragment', source(`${SITE}tavi?season=2025#goals`)],
		['a source on an xn-- host', source('https://xn--mnchen-3ya.example/')],
		['a source of 2,048 characters', source(SITE.padEnd(2048, 'a'))],
		['a Commons file name', photoSource(`${COMMONS}Tavi_Brightwell_(2025)_caf%C3%A9.jpg`)],
		['a photo source of 2,048 characters', photoSource(COMMONS.padEnd(2048, 'a'))],
		['a photo address of 2,048 characters', facts('photo.uri', `photos/${'a'.repeat(2036)}.webp`)],
		['an author with accents', author('Zoë Árvíztűrő')],
		['an author of 200 characters', author('a'.repeat(200))],
		...licences('the licence', 'CC0-1.0 CC-PDM-1.0 CC-BY-1.0 CC-BY-2.5-AU CC-BY-3.0-US CC-BY-4.0'),
		...licences('the licence', 'CC-BY-SA-2.0-UK CC-BY-SA-2.1-JP CC-BY-SA-3.0-IGO CC-BY-SA-4.0')
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
		...['nationalTeamCode', 'club', 'cardNumber', 'updateTime', 'photo', 'transferFee'],
		...['clubGoalCount', 'nationalTeamGoalCount', 'careerStartYear', 'careerEndYear'],
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
		['a tier outside the four', { tier: 'EPIC' }],
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
		['a photo on another host', facts('photo.uri', 'https://photos.example/7.webp')],
		['a photo address with a scheme', facts('photo.uri', 'http://photos.example/7.webp')],
		['a photo address with a host', facts('photo.uri', '//photos.example/7.webp')],
		['a photo address of 2,049 characters', facts('photo.uri', `photos/${'a'.repeat(2037)}.webp`)],
		['a photo zero pixels wide', facts('photo.widthPx', 0)],
		['a photo source over plain http', photoSource(COMMONS.replace('https', 'http') + 'Tavi.jpg')],
		['a photo source on another host', photoSource('https://evil.example/wiki/File:X.jpg')],
		[
			'a photo source after userinfo',
			photoSource(COMMONS.replace('/wiki', '@evil.example/wiki') + 'X.jpg')
		],
		[
			'a photo source on a longer host',
			photoSource(COMMONS.replace('/wiki', '.evil.example/wiki') + 'X.jpg')
		],
		['a photo source with no file name', photoSource(COMMONS)],
		['a photo source with a space', photoSource(`${COMMONS}Tavi Brightwell.jpg`)],
		['a photo source with a query', photoSource(`${COMMONS}Tavi.jpg?uselang=fr`)],
		['a photo source of 2,049 characters', photoSource(COMMONS.padEnd(2049, 'a'))],
		['an author with a tag', author('<a href="https://evil.example">Ina</a>')],
		['an author with a closing bracket', author('Ina > Vented')],
		['an author with an opening bracket', author('Ina <3')],
		['an author with a line break', author('Ina\nVented')],
		['an author with an escape character', author('Ina\u001bVented')],
		['an author with a next-line character', author('Ina\u0085Vented')],
		['an author with a bidirectional override', author('Ina\u202EdetneV')],
		['an author with a bidirectional isolate', author('Ina\u2066Vented')],
		['an author of spaces only', author('   ')],
		['an author of a no-break space only', author('\u00a0')],
		['an author of 201 characters', author('a'.repeat(201))],
		...licences('the licence', 'CC-BY-NC-4.0 CC-BY-ND-4.0 CC-BY-NC-SA-4.0 CC-PDDC CC-BY-5.0'),
		...licences('the licence', 'CC-BY-SA CC-BY-SA-2.1 CC-BY-4.0-AU cc-by-4.0 MIT'),
		['null awards', { awards: null }],
		['a null transfer fee', { transferFee: null }],
		['a transfer fee below zero', facts('transferFee.units', -1)],
		['a transfer fee with units as a string', facts('transferFee.units', '42000000')],
		['nanos below zero', facts('transferFee.nanos', -1)],
		['nanos of 1,000,000,000', facts('transferFee.nanos', 1_000_000_000)],
		['club goals below zero', facts('clubGoalCount.value', -1)],
		['a source over plain http', source('http://almanac.example/tavi')],
		['a source with userinfo', source('https://user:pass@evil.example/')],
		['a source with a backslash', source('https://almanac.example\\@evil.example/')],
		['a source with a backslash in its path', source(`${SITE}tavi\\brightwell`)],
		['a source with a control character', source(`${SITE}\u0000`)],
		['a source with a space', source(`${SITE}tavi brightwell`)],
		['a source with a bidirectional override', source(`${SITE}\u202Egpj.exe`)],
		['a source with a zero-width character', source('https://alma\u200Bnac.example/')],
		['a source with an empty host', source('https://@')],
		['a source with nothing after the scheme', source('https://')],
		['a source with an empty host label', source('https://almanac..example/')],
		['a source on a decimal host', source('https://2130706433/')],
		['a source on a hexadecimal host', source('https://0x7f.1/')],
		['a source on an IPv4 address', source('https://127.0.0.1/')],
		['a source on a private address', source('https://192.168.1.1:8443/admin')],
		['a source on localhost', source('https://localhost/')],
		['a source on a host of one label', source('https://a')],
		['a source on a host that is a hyphen', source('https://-/')],
		['a source on a host with an accent', source('https://münchen.example/')],
		['a source of 2,049 characters', source(SITE.padEnd(2049, 'a'))],
		['a null club goal count', { clubGoalCount: null }],
		['a null national team goal count', { nationalTeamGoalCount: null }],
		['a retrieve date that is not a date', facts('clubGoalCount.retrieveDate', 'last May')],
		['a career start year with a fraction', { careerStartYear: 2019.5 }],
		['a null career end year', { careerEndYear: null }]
	])('refuses %s', (_rule, overrides) => {
		expect(isValidPlayer(aPlayer(overrides))).toBe(false);
	});

	it.each([
		['a source', source(`${SITE}${'a'.repeat(200_000)} `)],
		['a source host', source(`https://${'a.'.repeat(100_000)} `)],
		['a source port', source(`https://a.example${':1'.repeat(100_000)}`)],
		['a source path', source(`${SITE}${'?#'.repeat(100_000)}\\`)],
		['a photo source', photoSource(`${COMMONS}${'a'.repeat(200_000)} `)],
		['an author', author(`${'a'.repeat(200_000)}<`)]
	])('refuses %s of 200,000 characters', (_rule, overrides) => {
		expect(isValidPlayer(aPlayer(overrides))).toBe(false);
	});

	it('says that the author is plain text', () => {
		const { description } = playerSchema.$defs.attribution.properties.author;
		expect(description).toContain('plain text');
	});

	it('compiles when every keyword must state its type', () => {
		const strict = new Ajv2020({ strictTypes: true }).addSchema(playersSchema);
		expect(() => strict.compile(playerSchema)).not.toThrow();
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
		['a player with a tier outside the four', { players: [aPlayer({ tier: 'EPIC' })] }],
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
		expect(committedTypes).toBe(await compileSchemaTypes(path));
	});
});
