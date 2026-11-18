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
// A name can't show a count that leaves the word out, such as `clubGoals`, so that
// part of D4 rests on review.
const BROKEN_SUFFIX_RULE =
	/^(is|num|urls?|counts?)(?![a-z])|(Urls?|Counts?)(?=[A-Z])|(Urls?|Counts)$/;
// A place under `$defs`, in this file or a schema file beside it. No scheme and no folder.
const REF_INSIDE_FOLDER = /^(\w[\w.-]*\.schema\.json)?#\/\$defs\/.+$/;
// Every keyword of JSON Schema 2020-12 that holds subschemas, and the older `definitions`.
const CHILD_MAPS = ['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas'];
const CHILD_LISTS = ['allOf', 'anyOf', 'oneOf', 'prefixItems'];
const FIRST_SCHEMAS = ['if', 'then', 'else', 'not', 'items', 'contains', 'propertyNames'];
const LAST_SCHEMAS = ['additionalProperties', 'unevaluatedProperties', 'unevaluatedItems'];
const CHILD_SCHEMAS = [...FIRST_SCHEMAS, ...LAST_SCHEMAS, 'contentSchema'];
// A condition tests a property that another place defines, so these two rules don't apply there.
const CONDITIONS = ['if', 'not'];
const DEFINITION_RULES: readonly DesignRule[] = ['name-not-resource-name', 'no-description'];

const isObject = (value: unknown): value is Schema => typeof value === 'object' && value !== null;
const isText = (value: unknown, form: RegExp): boolean =>
	typeof value === 'string' && form.test(value);
const leavesFolder = ({ $ref }: Schema): boolean =>
	typeof $ref === 'string' && !REF_INSIDE_FOLDER.test($ref);

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
	['ref-outside-folder', leavesFolder]
] as const satisfies readonly (readonly [string, (schema: Schema, name: string) => boolean])[];

// The type generator follows a text `$ref` in any object, so a map of schemas is tested too.
const reportRef = (data: unknown, path: string): DesignProblem[] =>
	isObject(data) && leavesFolder(data) ? [{ path, rule: 'ref-outside-folder' }] : [];

/** Finds a `$ref` in data, such as `examples` or `default`, which the type generator would still follow. */
function findRefs(data: unknown, path: string): DesignProblem[] {
	if (!isObject(data)) return [];
	return [
		...reportRef(data, path),
		...Object.entries(data).flatMap(([key, value]) => findRefs(value, `${path}/${key}`))
	];
}

function walkKeyword(key: string, value: unknown, { path, ignored }: Place): DesignProblem[] {
	if ([...CHILD_MAPS, ...CHILD_LISTS].includes(key)) {
		const children = Object.entries(isObject(value) ? value : {}).flatMap(([id, child]) =>
			walk(child, { path: `${path}/${id}`, name: key === 'properties' ? id : '', ignored })
		);
		return [...reportRef(value, path), ...children];
	}
	if (!CHILD_SCHEMAS.includes(key)) return findRefs(value, path);
	const rulesOff = CONDITIONS.includes(key) ? DEFINITION_RULES : ignored;
	return walk(value, { path, name: '', ignored: rulesOff });
}

function walk(schema: unknown, place: Place): DesignProblem[] {
	if (!isObject(schema)) return [];
	const { path, name, ignored } = place;
	const broken = RULES.filter(([rule, breaks]) => !ignored.includes(rule) && breaks(schema, name));
	return [
		...broken.map(([rule]) => ({ path, rule })),
		...Object.entries(schema).flatMap(([key, value]) =>
			walkKeyword(key, value, { ...place, path: `${path}/${key}` })
		)
	];
}

/** Returns each design rule of ADR 0005 that a schema breaks, with the path of the place. */
export function lintSchemaDesign(schema: unknown): DesignProblem[] {
	return walk(schema, { path: '#', name: '', ignored: [] });
}
