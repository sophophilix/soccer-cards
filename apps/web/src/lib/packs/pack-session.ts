import { TIERS, addPendingPack, openPlayerPack } from '@soccer-cards/game';
import type {
	Card,
	CardId,
	CheckedCardSet,
	PackToOpen,
	PlayerState,
	Position,
	StateRefusal,
	StateResult,
	Tier
} from '@soccer-cards/game';
import type { CardFrontProps } from '../cards/card-front.ts';
import type { PlayerStore, SaveResult } from '../state/player-store.ts';

/** The new state and whether the store saved it, or why the game refused the step. */
export type PackStepResult<Reason extends StateRefusal> =
	| { readonly ok: true; readonly value: PlayerState; readonly saved: SaveResult }
	| { readonly ok: false; readonly reason: Reason };

type Saver = Pick<PlayerStore, 'save'>;

const TIER_RANK: ReadonlyMap<Tier, number> = new Map(TIERS.map((tier, rank) => [tier, rank]));
const FRONT_TIERS = { base: 'BASE', rare: 'RARE', legend: 'LEGEND', icon: 'ICON' } as const;
const FRONT_POSITIONS = {
	GK: 'GOALKEEPER',
	DF: 'DEFENDER',
	MF: 'MIDFIELDER',
	FW: 'FORWARD'
} as const satisfies Record<Position, CardFrontProps['position']>;

function saveStep<Reason extends StateRefusal>(
	store: Saver,
	result: StateResult<Reason>
): PackStepResult<Reason> {
	return result.ok ? { ...result, saved: store.save(result.value) } : result;
}

/** Opens a pack by the game's rules and saves its cards as pending, so a reload keeps them. */
export function openPackAndSave(
	store: Saver,
	state: PlayerState,
	pack: PackToOpen
): PackStepResult<'pack-pending' | 'not-enough-coins' | 'not-enough-cards'> {
	return saveStep(store, openPlayerPack(state, pack));
}

/** Adds the pending pack's cards to the collection and saves it. */
export function addPackAndSave(
	store: Saver,
	state: PlayerState
): PackStepResult<'no-pending-pack'> {
	return saveStep(store, addPendingPack(state));
}

/** Returns the pack's cards in the order they are shown, lowest tier first, so the best is last. */
export function revealOrder(cardIds: readonly CardId[], cardSet: CheckedCardSet): readonly Card[] {
	const byId = new Map(cardSet.map((card) => [card.id, card]));
	const rank = (card: Card): number => TIER_RANK.get(card.tier) ?? 0;
	// A card the set no longer has can't be drawn on a card, so it is left out of the reveal.
	const cards = cardIds.map((id) => byId.get(id)).filter((card) => card !== undefined);
	return cards.toSorted((first, second) => rank(first) - rank(second));
}

/** Writes a card id such as `tavi-brightwell` as a name, `Tavi Brightwell`. */
export function nameFromCardId(id: CardId): string {
	return id
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

// The card set holds no name, nation, club or shirt number yet, so the front shows only what
// the set holds. The name comes from the card id until lib/data reads displayName.
/** Returns what the front of a card shows, from the fields the card set holds. */
export function frontOf(card: Card): CardFrontProps {
	return {
		displayName: nameFromCardId(card.id),
		position: FRONT_POSITIONS[card.position],
		nationalTeamCode: '',
		clubName: '',
		shirtNumber: 0,
		tier: FRONT_TIERS[card.tier],
		overall: card.overall,
		attack: card.attack,
		defence: card.defence,
		control: card.control
	};
}

/** Returns a seed for the game's random source from the browser's crypto generator. */
export function randomSeed(): number {
	return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}
