type Schema = Readonly<Record<string, unknown>>;
type DesignRule = (typeof RULES)[number][0];
/** Where a schema sits: its JSON pointer, its name if it is a property, and the rules not to apply. */
interface Place {
	readonly path: string;
	readonly name: string;
	readonly ignored: readonly DesignRule[];
}
/** One design rule of ADR 0005 that a schema breaks, and the JSON pointer of the place. */
interface DesignProblem {
	readonly path: string;
	readonly rule: DesignRule;
}

const LOWER_CAMEL_CASE = /^[a-z][a-z0-9]*([A-Z][a-z0-9]+)*$/;
const UPPER_SNAKE_CASE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;
// ADR 0005 D2: a collection, then a slug of 63 characters at most.
const RESOURCE_NAME_PATTERN = /^\^[a-z][A-Za-z]*\/\[a-z\]\[a-z0-9-\]\{0,62\}\$$/;
// ADR 0005 D4: no `is` or `num` prefix, `uri` not `url`, and a count ends in `Count`.
const BROKEN_SUFFIX_RULE = /^(is|num|url|counts?)(?![a-z])|(Url|Counts?)(?=[A-Z])|(Url|Counts)$/;
// A file beside this one, a place inside this file, or both. No scheme and no folder.
const REF_INSIDE_FOLDER = /^(\w[\w.-]*)?(#.*)?$/;
const CHILD_MAPS = ['properties', '$defs', 'allOf', 'anyOf', 'oneOf'];
const CHILD_SCHEMAS = ['if', 'then', 'else', 'not', 'items'];
// A condition tests a property that another place defines, so these two rules don't apply there.
const CONDITIONS = ['if', 'not'];
const DEFINITION_RULES: readonly DesignRule[] = ['name-not-resource-name', 'no-description'];

const isObject = (value: unknown): value is Schema => typeof value === 'object' && value !== null;
const isText = (value: unknown, form: RegExp): boolean =>
	typeof value === 'string' && form.test(value);

/** Each rule, with a test that is true when the schema at a place breaks it. */
const RULES = [
	['name-not-lower-camel-case', (_schema, name) => name !== '' && !LOWER_CAMEL_CASE.test(name)],
	['name-breaks-suffix-rule', (_schema, name) => BROKEN_SUFFIX_RULE.test(name)],
	[
		'name-not-resource-name',
		({ pattern }, name) => name === 'name' && !isText(pattern, RESOURCE_NAME_PATTERN)
	],
	['no-description', ({ description }, name) => name !== '' && !isText(description, /\S/)],
	[
		'type-allows-null',
		({ type, const: constant, enum: values }) =>
			[type].flat().includes('null') || constant === null || [values].flat().includes(null)
	],
	[
		'enum-not-upper-snake-case',
		({ enum: values }) =>
			Array.isArray(values) && !values.every((value) => isText(value, UPPER_SNAKE_CASE))
	],
	['ref-outside-folder', ({ $ref }) => $ref !== undefined && !isText($ref, REF_INSIDE_FOLDER)]
] as const satisfies readonly (readonly [string, (schema: Schema, name: string) => boolean])[];

function walk(schema: unknown, { path, name, ignored }: Place): DesignProblem[] {
	if (!isObject(schema)) return [];
	const broken = RULES.filter(([rule, breaks]) => !ignored.includes(rule) && breaks(schema, name));
	return [
		...broken.map(([rule]) => ({ path, rule })),
		...CHILD_MAPS.flatMap((key) =>
			Object.entries(isObject(schema[key]) ? schema[key] : {}).flatMap(([id, child]) =>
				walk(child, { path: `${path}/${key}/${id}`, name: key === 'properties' ? id : '', ignored })
			)
		),
		...CHILD_SCHEMAS.flatMap((key) =>
			walk(schema[key], {
				path: `${path}/${key}`,
				name: '',
				ignored: CONDITIONS.includes(key) ? DEFINITION_RULES : ignored
			})
		)
	];
}

/** Returns each design rule of ADR 0005 that a schema breaks, with the path of the place. */
export function lintSchemaDesign(schema: unknown): DesignProblem[] {
	return walk(schema, { path: '#', name: '', ignored: [] });
}
