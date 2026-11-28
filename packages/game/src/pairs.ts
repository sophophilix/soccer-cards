import type { CardId, CheckedCardSet } from './cards.ts';
import type { Random } from './random.ts';
import type { PlayerState } from './state.ts';

/** The numbers of pairs a board can have. */
export const PAIRS_SIZES = [6, 8, 10] as const;

export type PairsSize = (typeof PAIRS_SIZES)[number];

export type PairsCardState = 'down' | 'up' | 'matched';

/** One place on the board. */
export interface PairsCard {
	readonly id: CardId;
	readonly state: PairsCardState;
}

/** A game of Pairs. There is no timer and nothing is lost. */
export interface PairsBoard {
	readonly size: PairsSize;
	readonly cards: readonly PairsCard[];
	readonly turns: number;
	/** The two unmatched cards showing, until `settleTurn` turns them down. */
	readonly mismatch: readonly [number, number] | null;
	readonly firstIndex: number | null;
	readonly isComplete: boolean;
}

/** Why a board was not dealt. */
export type PairsRefusal = 'not-enough-cards';

/** The new board, or the reason it was refused. */
export type PairsResult =
	| { readonly ok: true; readonly value: PairsBoard }
	| { readonly ok: false; readonly reason: PairsRefusal };

function ownedIds(state: PlayerState, cardSet: CheckedCardSet): CardId[] {
	return cardSet.map((entry) => entry.id).filter((id) => (state.collection[id] ?? 0) > 0);
}

/** Returns the board sizes the player can play: a size needs that many different owned cards. */
export function pairsSizesFor(state: PlayerState, cardSet: CheckedCardSet): PairsSize[] {
	const owned = ownedIds(state, cardSet).length;
	return PAIRS_SIZES.filter((size) => size <= owned);
}

/** Deals a face-down board of two cards each of `size` different owned cards. */
export function dealPairs(
	state: PlayerState,
	cardSet: CheckedCardSet,
	size: PairsSize,
	random: Random
): PairsResult {
	const owned = ownedIds(state, cardSet);
	if (!PAIRS_SIZES.includes(size) || owned.length < size) {
		return { ok: false, reason: 'not-enough-cards' };
	}
	const picked = random.sample(owned, size);
	const cards = random
		.sample([...picked, ...picked], size * 2)
		.map((id): PairsCard => ({ id, state: 'down' }));
	return {
		ok: true,
		value: { size, cards, turns: 0, mismatch: null, firstIndex: null, isComplete: false }
	};
}

function withStates(board: PairsBoard, changes: ReadonlyMap<number, PairsCardState>): PairsCard[] {
	return board.cards.map((entry, i) => ({ ...entry, state: changes.get(i) ?? entry.state }));
}

/** Turns a card up. A card that is up or matched, or a tap while a mismatch shows, changes nothing. */
export function turnCard(board: PairsBoard, index: number): PairsBoard {
	const tapped = board.cards[index];
	if (board.mismatch !== null || tapped?.state !== 'down') {
		return board;
	}
	const firstIndex = board.firstIndex;
	const first = firstIndex === null ? undefined : board.cards[firstIndex];
	if (firstIndex === null || first === undefined) {
		return { ...board, cards: withStates(board, new Map([[index, 'up']])), firstIndex: index };
	}
	const turns = board.turns + 1;
	if (first.id === tapped.id) {
		const cards = withStates(
			board,
			new Map<number, PairsCardState>([
				[firstIndex, 'matched'],
				[index, 'matched']
			])
		);
		return {
			...board,
			cards,
			turns,
			firstIndex: null,
			isComplete: cards.every((entry) => entry.state === 'matched')
		};
	}
	return {
		...board,
		cards: withStates(board, new Map([[index, 'up']])),
		turns,
		firstIndex: null,
		mismatch: [firstIndex, index]
	};
}

/** Turns the two unmatched cards back down. A board with no mismatch is returned as it is. */
export function settleTurn(board: PairsBoard): PairsBoard {
	if (board.mismatch === null) {
		return board;
	}
	const [a, b] = board.mismatch;
	return {
		...board,
		cards: withStates(
			board,
			new Map<number, PairsCardState>([
				[a, 'down'],
				[b, 'down']
			])
		),
		mismatch: null
	};
}
