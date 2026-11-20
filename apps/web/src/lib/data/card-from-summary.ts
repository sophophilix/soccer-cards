import { toCardId } from '@soccer-cards/game';
import type { Card, Position, Tier } from '@soccer-cards/game';

type Fields = Readonly<Record<string, unknown>>;
type PlayStats = Pick<Card, 'attack' | 'defence' | 'control' | 'overall'>;

// Maps, so a value such as "toString" can never match a built-in property of an object.
const TIER_BY_API_VALUE: ReadonlyMap<unknown, Tier> = new Map([
	['BASE', 'base'],
	['RARE', 'rare'],
	['LEGEND', 'legend'],
	['ICON', 'icon']
] as const);
const POSITION_BY_API_VALUE: ReadonlyMap<unknown, Position> = new Map([
	['GOALKEEPER', 'GK'],
	['DEFENDER', 'DF'],
	['MIDFIELDER', 'MF'],
	['FORWARD', 'FW']
] as const);

const MIN_RATING = 1;
const MAX_RATING = 99;
// The schema's pattern for a player's resource name, players/{player}. The slug is the card id.
const PLAYER_NAME = /^players\/([a-z][a-z0-9-]{0,62})$/;
// Required by the schema, but the card doesn't use their values. An unknown `state` is still a string.
const REQUIRED_TEXT_FIELDS = ['displayName', 'nationalTeamCode', 'state'] as const;

const isFields = (value: unknown): value is Fields =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): boolean => typeof value === 'string' && value !== '';
const isRating = (value: unknown): value is number =>
	Number.isInteger(value) && Number(value) >= MIN_RATING && Number(value) <= MAX_RATING;
const isPlayStats = (value: unknown): value is PlayStats =>
	isFields(value) &&
	isRating(value.attack) &&
	isRating(value.defence) &&
	isRating(value.control) &&
	isRating(value.overall);

function slugOf(name: unknown): string | undefined {
	return typeof name === 'string' ? PLAYER_NAME.exec(name)?.[1] : undefined;
}

/** Turns one summary from players.json into a card, or `undefined` when the card is unknown. */
export function cardFromSummary(summary: unknown): Card | undefined {
	if (!isFields(summary)) return undefined;
	const slug = slugOf(summary.name);
	const tier = TIER_BY_API_VALUE.get(summary.tier);
	const position = POSITION_BY_API_VALUE.get(summary.position);
	const stats = summary.playStats;
	const hasText = REQUIRED_TEXT_FIELDS.every((field) => isText(summary[field]));
	if (slug === undefined || tier === undefined || position === undefined) return undefined;
	if (!hasText || !isPlayStats(stats)) return undefined;
	const { attack, defence, control, overall } = stats;
	return { id: toCardId(slug), tier, position, overall, attack, defence, control };
}
