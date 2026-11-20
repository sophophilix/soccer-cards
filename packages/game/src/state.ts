import type { CardId, CheckedCardSet } from './cards.ts';
import { DIVISIONS } from './divisions.ts';
import type { Division } from './divisions.ts';
import { drawPack } from './draw-pack.ts';
import type { PackKind } from './draw-pack.ts';
import { TEAM_SIZE } from './lineup.ts';
import type { Random } from './random.ts';

/** The version of the player state's shape. A change of shape raises it. */
export const STATE_VERSION = 2;
/** The free standard packs a new player starts with. */
export const STARTING_FREE_PACKS = 2;
/** The coins a new player starts with. */
export const STARTING_COINS = 0;
/** The price of a standard pack once the free packs are used. */
export const STANDARD_PACK_COST_COINS = 5;
/** The price of a jumbo pack. A free pack never pays for it. */
export const JUMBO_PACK_COST_COINS = 20;
/** The wins in one division that move the player up to the next. */
export const WINS_TO_GO_UP = 3;

const PACK_COST_COINS = {
	standard: STANDARD_PACK_COST_COINS,
	jumbo: JUMBO_PACK_COST_COINS
} as const satisfies Record<PackKind, number>;

/** An opened pack the player has not added to the collection yet. */
export interface PendingPack {
	readonly kind: PackKind;
	readonly cardIds: readonly CardId[];
}

/** Everything the game remembers about one player. */
export interface PlayerState {
	readonly version: typeof STATE_VERSION;
	readonly freePacks: number;
	readonly coins: number;
	/** How many copies of each card the player has. A card not held has no entry. */
	readonly collection: Readonly<Record<CardId, number>>;
	readonly favourites: readonly CardId[];
	readonly pendingPack: PendingPack | null;
	readonly division: Division['id'];
	/** Wins since the player came into this division. The top division keeps counting. */
	readonly divisionWins: number;
	readonly wins: number;
	readonly losses: number;
}

/** Why a change to the player state was refused. */
export type StateRefusal =
	'pack-pending' | 'not-enough-coins' | 'not-enough-cards' | 'no-pending-pack';

/** The new player state, or the reason the action was refused. A refusal changes nothing. */
export type StateResult<Reason extends StateRefusal> =
	| { readonly ok: true; readonly value: PlayerState }
	| { readonly ok: false; readonly reason: Reason };

/** What opening a pack needs besides the player's state. */
export interface PackToOpen {
	readonly kind: PackKind;
	readonly cardSet: CheckedCardSet;
	readonly random: Random;
}

/** Returns the state of a player who has not played yet. */
export function createPlayerState(): PlayerState {
	return {
		version: STATE_VERSION,
		freePacks: STARTING_FREE_PACKS,
		coins: STARTING_COINS,
		collection: {},
		favourites: [],
		pendingPack: null,
		division: DIVISIONS[0].id,
		divisionWins: 0,
		wins: 0,
		losses: 0
	};
}

/** Returns the price of a kind of pack in coins. */
export function packCostCoins(kind: PackKind): number {
	return PACK_COST_COINS[kind];
}

/** Pays for a pack with a free pack or coins, opens it and holds its cards as pending. */
export function openPlayerPack(
	state: PlayerState,
	pack: PackToOpen
): StateResult<'pack-pending' | 'not-enough-coins' | 'not-enough-cards'> {
	if (state.pendingPack !== null) {
		return { ok: false, reason: 'pack-pending' };
	}
	const isFree = pack.kind === 'standard' && state.freePacks > 0;
	const costCoins = isFree ? 0 : packCostCoins(pack.kind);
	if (state.coins < costCoins) {
		return { ok: false, reason: 'not-enough-coins' };
	}
	// The cards are drawn before anything is paid, so a card set with an empty tier costs nothing.
	const opened = drawPack(pack.cardSet, pack.kind, pack.random);
	if (!opened.ok) {
		return { ok: false, reason: opened.reason };
	}
	return {
		ok: true,
		value: {
			...state,
			freePacks: isFree ? state.freePacks - 1 : state.freePacks,
			coins: state.coins - costCoins,
			pendingPack: { kind: pack.kind, cardIds: opened.value }
		}
	};
}

/** Adds the pending pack's cards to the collection, counting doubles, and clears the pack. */
export function addPendingPack(state: PlayerState): StateResult<'no-pending-pack'> {
	if (state.pendingPack === null) {
		return { ok: false, reason: 'no-pending-pack' };
	}
	// A map, so a card id can never be mistaken for a built-in property of an object.
	const copies = new Map<string, number>(Object.entries(state.collection));
	for (const cardId of state.pendingPack.cardIds) {
		copies.set(cardId, (copies.get(cardId) ?? 0) + 1);
	}
	return {
		ok: true,
		value: { ...state, collection: Object.fromEntries(copies), pendingPack: null }
	};
}

/** Says whether the player owns the 11 different cards a match needs. */
export function canPlayMatch(state: PlayerState): boolean {
	return Object.values(state.collection).filter((copies) => copies > 0).length >= TEAM_SIZE;
}

/** Pays the division's prize, counts the win, and moves the player up after enough wins. */
export function recordWin(state: PlayerState): PlayerState {
	const rank = DIVISIONS.findIndex((division) => division.id === state.division);
	const division = DIVISIONS[rank];
	if (division === undefined) {
		throw new RangeError(`the player is in an unknown division: ${state.division}`);
	}
	const next = DIVISIONS[rank + 1];
	const divisionWins = state.divisionWins + 1;
	const goesUp = next !== undefined && divisionWins >= WINS_TO_GO_UP;
	return {
		...state,
		coins: state.coins + division.winCoins,
		wins: state.wins + 1,
		division: goesUp ? next.id : state.division,
		divisionWins: goesUp ? 0 : divisionWins
	};
}

/** Counts a loss. A loss never costs coins or moves the player down. */
export function recordLoss(state: PlayerState): PlayerState {
	return { ...state, losses: state.losses + 1 };
}
