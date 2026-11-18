import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import playerSchema from '../schemas/v1/player.schema.json' with { type: 'json' };

// Every file in the folder, as text, so a new example is checked without a change here.
const EXAMPLES = import.meta.glob('../schemas/v1/examples/*', { eager: true, query: '?raw' });
const { $defs, properties } = playerSchema;
const FIELDS = Object.keys({ ...$defs.playerSummary.properties, ...properties }).sort();
const ajv = new Ajv2020({ allErrors: true });
const validate = ajv.compile(playerSchema);

/** The files that fail the player schema, each with its reason. An empty folder fails too. */
function failuresIn(files: Readonly<Record<string, { default: string }>>): string[] {
	const failureOf = (file: string, text: string): string[] =>
		validate(JSON.parse(text)) ? [] : [`${file}: ${ajv.errorsText(validate.errors)}`];
	const failures = Object.entries(files).flatMap(([file, raw]) => failureOf(file, raw.default));
	return Object.keys(files).length === 0 ? ['no examples found'] : failures;
}

describe('the examples beside the player schema', () => {
	it('all pass the schema', () => {
		expect(failuresIn(EXAMPLES)).toEqual([]);
	});

	it.each([
		['outfield', 'goalkeeperRatings'],
		['goalkeeper', 'outfieldRatings']
	])('the %s player uses every field but %s', (kind, otherRatings) => {
		const text = EXAMPLES[`../schemas/v1/examples/player.${kind}.json`]?.default ?? '{}';
		expect([...Object.keys(JSON.parse(text) as object), otherRatings].sort()).toEqual(FIELDS);
	});

	it('a file that fails the schema is named', () => {
		const failures = failuresIn({ ...EXAMPLES, 'bad.json': { default: '{ "tier": "GOLD" }' } });
		expect(failures).toEqual([expect.stringMatching(/^bad\.json: .*tier/)]);
	});

	it('an empty folder fails', () => {
		expect(failuresIn({})).toEqual(['no examples found']);
	});
});
