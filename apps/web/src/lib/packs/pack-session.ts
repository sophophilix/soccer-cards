import { TIERS, addPendingPack, openPlayerPack } from '@soccer-cards/game';
import type {
	Card,
	CardId,
	CheckedCardSet,
	PackToOpen,
	PlayerState,
	StateRefusal,
	StateResult,
	Tier
} from '@soccer-cards/game';
import type { PlayerStore, SaveResult } from '../state/player-store.ts';

/** The new state and whether the store saved it, or why the game refused the step. */
export type PackStepResult<Reason extends StateRefusal> =
	| { readonly ok: true; readonly value: PlayerState; readonly saved: SaveResult }
	| { readonly ok: false; readonly reason: Reason };

type Store = Pick<PlayerStore, 'load' | 'save'>;

const TIER_RANK: ReadonlyMap<Tier, number> = new Map(TIERS.map((tier, rank) => [tier, rank]));

// A caller holding an older state must not replace a pending pack or add it twice, so the
// store's saved state wins. Without saved state, the caller's state is the only one there is.
function latestState(store: Store, state: PlayerState): PlayerState {
	const loaded = store.load();
	return loaded.outcome === 'loaded' ? loaded.state : state;
}

function saveStep<Reason extends StateRefusal>(
	store: Store,
	result: StateResult<Reason>
): PackStepResult<Reason> {
	return result.ok ? { ...result, saved: store.save(result.value) } : result;
}

/** Opens a pack by the game's rules and saves its cards as pending, so a reload keeps them. */
export function openPackAndSave(
	store: Store,
	state: PlayerState,
	pack: PackToOpen
): PackStepResult<'pack-pending' | 'not-enough-coins' | 'not-enough-cards'> {
	return saveStep(store, openPlayerPack(latestState(store, state), pack));
}

/** Adds the pending pack's cards to the collection and saves it. */
export function addPackAndSave(
	store: Store,
	state: PlayerState
): PackStepResult<'no-pending-pack'> {
	return saveStep(store, addPendingPack(latestState(store, state)));
}

/** Returns the pack's cards in the order they are shown, lowest tier first, so the best is last. */
export function revealOrder(cardIds: readonly CardId[], cardSet: CheckedCardSet): readonly Card[] {
	const byId = new Map(cardSet.map((card) => [card.id, card]));
	const rank = (card: Card): number => TIER_RANK.get(card.tier) ?? 0;
	// A card the set no longer has can't be drawn on a card, so it is left out of the reveal.
	const cards = cardIds.map((id) => byId.get(id)).filter((card) => card !== undefined);
	return cards.toSorted((first, second) => rank(first) - rank(second));
}

/** Returns a seed for the game's random source from the browser's crypto generator. */
export function randomSeed(): number {
	return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}
