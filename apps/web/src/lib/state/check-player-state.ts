import { DIVISIONS, STATE_VERSION, toCardId } from '@soccer-cards/game';
import type { CardId, PendingPack, PlayerState } from '@soccer-cards/game';

type Fields = Readonly<Record<string, unknown>>;

/** Turns a saved state of version `from` into one of version `from + 1`. */
export interface Migration {
	readonly from: number;
	readonly migrate: (saved: Fields) => unknown;
}

/** The migrations from each older version. No older version was ever saved on a device. */
const MIGRATIONS: readonly Migration[] = [];

/** A saved state the game can use, or why it can't. */
export type CheckedState =
	| { readonly ok: true; readonly value: PlayerState }
	| { readonly ok: false; readonly reason: 'invalid' | 'newer-version' };

const isFields = (value: unknown): value is Fields =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const isCount = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;
// The same rule as `toCardId`, so a checked id never makes it throw.
const isCardId = (value: unknown): value is string =>
	typeof value === 'string' && value.trim() !== '';
const isCardIds = (value: unknown): value is readonly string[] =>
	Array.isArray(value) && value.every(isCardId);
const isDivision = (value: unknown): value is PlayerState['division'] =>
	DIVISIONS.some((division) => division.id === value);
const versionOf = (value: unknown): number =>
	isFields(value) && isCount(value.version) ? value.version : STATE_VERSION;

function checkCollection(value: unknown): PlayerState['collection'] | undefined {
	if (!isFields(value) || !Object.values(value).every(isCount)) return undefined;
	// Every key is a card id and every value a count, checked straight above.
	return Object.keys(value).every(isCardId) ? ({ ...value } as Record<CardId, number>) : undefined;
}

function checkPendingPack(value: unknown): PendingPack | null | undefined {
	if (value === null) return null;
	if (!isFields(value) || !isCardIds(value.cardIds)) return undefined;
	const { kind } = value;
	return kind === 'standard' || kind === 'jumbo'
		? { kind, cardIds: value.cardIds.map(toCardId) }
		: undefined;
}

function checkCurrent(saved: unknown): PlayerState | undefined {
	if (!isFields(saved) || saved.version !== STATE_VERSION) return undefined;
	const { freePacks, coins, favourites, division, divisionWins, wins, losses } = saved;
	const collection = checkCollection(saved.collection);
	const pendingPack = checkPendingPack(saved.pendingPack);
	if (![freePacks, coins, divisionWins, wins, losses].every(isCount)) return undefined;
	if (collection === undefined || pendingPack === undefined) return undefined;
	if (!isCardIds(favourites) || !isDivision(division)) return undefined;
	const counts = { freePacks, coins, divisionWins, wins, losses };
	const checked = { ...counts, collection, favourites: favourites.map(toCardId), pendingPack };
	// Each count was checked by `isCount` above, which can't narrow the names one by one.
	return { version: STATE_VERSION, ...checked, division } as PlayerState;
}

/** Brings a saved value up to the current version, then checks every field before trusting it. */
export function checkPlayerState(saved: unknown, migrations = MIGRATIONS): CheckedState {
	let current = saved;
	for (let version = versionOf(current); version < STATE_VERSION; version += 1) {
		const migration = migrations.find((each) => each.from === version);
		if (migration === undefined || !isFields(current)) return { ok: false, reason: 'invalid' };
		current = migration.migrate(current);
		// A migration must move up exactly one version, or the loop would never end.
		if (versionOf(current) !== version + 1) return { ok: false, reason: 'invalid' };
	}
	if (versionOf(current) > STATE_VERSION) return { ok: false, reason: 'newer-version' };
	const state = checkCurrent(current);
	return state === undefined ? { ok: false, reason: 'invalid' } : { ok: true, value: state };
}
