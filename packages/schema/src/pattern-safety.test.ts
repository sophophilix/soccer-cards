import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SCHEMA_PATHS } from './index.ts';

interface FoundPattern {
	readonly schema: string;
	readonly property: string;
	readonly pattern: string;
}

/** A host's labels. The repeat is safe because each label ends at a dot its class can't match. */
const DOT_DELIMITED_GROUP = String.raw`([A-Za-z0-9-]+\.)+`;

const isRepeat = (char: string): boolean => char === '+' || char === '*' || char === '{';

/** The index after a character class that starts at `index`. */
function endOfClass(pattern: string, start: number): number {
	let index = start + 1;
	while (index < pattern.length && pattern.charAt(index) !== ']') {
		index += pattern.charAt(index) === '\\' ? 2 : 1;
	}
	return index + 1;
}

/** The quantified groups of a pattern that hold another quantifier, such as `(a+)+`. */
function nestedQuantifiers(pattern: string): readonly string[] {
	const found: string[] = [];
	const open: { start: number; hasRepeat: boolean }[] = [];
	let index = 0;
	while (index < pattern.length) {
		const char = pattern.charAt(index);
		if (char === '\\') {
			index += 2;
		} else if (char === '[') {
			index = endOfClass(pattern, index);
		} else {
			if (char === '(') open.push({ start: index, hasRepeat: false });
			else if (char === ')') closeGroup(pattern, index, open, found);
			else if (isRepeat(char)) markRepeat(open);
			index += 1;
		}
	}
	return found;
}

function markRepeat(open: { hasRepeat: boolean }[]): void {
	const group = open.at(-1);
	if (group !== undefined) group.hasRepeat = true;
}

function closeGroup(
	pattern: string,
	index: number,
	open: { start: number; hasRepeat: boolean }[],
	found: string[]
): void {
	const group = open.pop();
	if (group === undefined) return;
	const isRepeated = isRepeat(pattern.charAt(index + 1));
	if (group.hasRepeat && isRepeated) found.push(pattern.slice(group.start, index + 2));
	if (group.hasRepeat || isRepeated) markRepeat(open);
}

/** The nested quantifiers in a pattern, minus the one group known to be safe. */
const unsafeGroups = (pattern: string): readonly string[] =>
	nestedQuantifiers(pattern).filter((group) => group !== DOT_DELIMITED_GROUP);

/** Every `pattern` and `patternProperties` key in a schema, with where it is. */
function collectPatterns(schema: string, node: unknown, property: string): FoundPattern[] {
	if (typeof node !== 'object' || node === null) return [];
	const record = node as Record<string, unknown> & {
		pattern?: unknown;
		patternProperties?: object;
	};
	const here: FoundPattern[] = [];
	if (typeof record.pattern === 'string') {
		here.push({ schema, property, pattern: record.pattern });
	}
	const keys = Object.keys(record.patternProperties ?? {});
	here.push(
		...keys.map((pattern) => ({ schema, property: `${property}/patternProperties`, pattern }))
	);
	return [
		...here,
		...Object.entries(record).flatMap(([key, child]) =>
			collectPatterns(schema, child, `${property}/${key}`)
		)
	];
}

const SCHEMA_PATTERNS = Object.values(SCHEMA_PATHS).flatMap((path) => {
	const schema = JSON.parse(
		readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
	) as unknown;
	return collectPatterns(path, schema, '#');
});

describe('schema patterns', () => {
	it('finds the patterns of the schemas', () => {
		expect(SCHEMA_PATTERNS.length).toBeGreaterThan(10);
	});

	it.each(SCHEMA_PATTERNS.map((found) => [`${found.schema} ${found.property}`, found] as const))(
		'has no nested quantifier in %s',
		(_where, { schema, property, pattern }) => {
			expect({ schema, property, pattern, unsafe: unsafeGroups(pattern) }).toEqual({
				schema,
				property,
				pattern,
				unsafe: []
			});
		}
	);

	it.each([
		['(a+)+', ['(a+)+']],
		[String.raw`^(\w*)*$`, [String.raw`(\w*)*`]],
		['^((a+)b)*$', ['((a+)b)*']],
		['^(a{2,})+$', ['(a{2,})+']]
	])('refuses the invented pattern %s', (pattern, expected) => {
		expect(unsafeGroups(pattern)).toEqual(expected);
	});

	it.each([
		['an escaped plus', String.raw`^(a\+)+$`],
		['an escaped star', String.raw`^(a\*)*$`],
		['a plus in a character class', '^([+*]x)+$'],
		['an optional group of one repeat', '^(a+)?$'],
		['a repeat outside a group', '^a+b*$'],
		['no group at all', '^abc$']
	])('accepts %s', (_name, pattern) => {
		expect(unsafeGroups(pattern)).toEqual([]);
	});
});
