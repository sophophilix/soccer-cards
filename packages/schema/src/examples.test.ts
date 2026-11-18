import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import playerSchema from '../schemas/v1/player.schema.json' with { type: 'json' };

// Every file in the folder, as text, so a new example is checked without a change here.
const EXAMPLES = import.meta.glob('../schemas/v1/examples/*', { eager: true, query: '?raw' });
const { $defs, properties } = playerSchema;
const FIELDS = Object.keys({ ...$defs.playerSummary.properties, ...properties }).sort();
const ajv = new Ajv2020({ allErrors: true });
const validate = ajv.compile(playerSchema);

/** Why a file fails the player schema, with the file's name. Empty when it passes. */
function failureOf(file: string, text: string): string[] {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch (error) {
		return [`${file}: not valid JSON: ${String(error)}`];
	}
	return validate(value) ? [] : [`${file}: ${ajv.errorsText(validate.errors)}`];
}

/** The files that fail the player schema, each with its reason. An empty folder fails too. */
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

describe('the examples beside the player schema', () => {
	it('all pass the schema', () => {
		expect(failuresIn(EXAMPLES)).toEqual([]);
	});

	it('between them use every field', () => {
		expect(fieldsMissingFrom(EXAMPLES)).toEqual([]);
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
		const tiers = Object.values(EXAMPLES).map(
			(raw) => (JSON.parse(raw.default) as { tier?: string }).tier
		);
		expect(tiers).toContain('ICON');
	});

	it('a field that no example carries is named', () => {
		const outfield = '../schemas/v1/examples/player.outfield.json';
		const missing = fieldsMissingFrom({ [outfield]: EXAMPLES[outfield] ?? { default: '{}' } });
		expect(missing).toEqual(['careerEndYear', 'goalkeeperRatings']);
	});

	it.each([
		['fails the schema', '{ "tier": "GOLD" }', /^bad\.json: .*tier/],
		["isn't valid JSON", '{ "tier": ', /^bad\.json: not valid JSON/],
		["isn't an object", '[]', /^bad\.json: .*must be object/]
	])('a file that %s is named', (_fault, text, reason) => {
		const failures = failuresIn({ ...EXAMPLES, 'bad.json': { default: text } });
		expect(failures).toEqual([expect.stringMatching(reason)]);
	});

	it('an empty folder fails', () => {
		expect(failuresIn({})).toEqual(['no examples found']);
	});
});
