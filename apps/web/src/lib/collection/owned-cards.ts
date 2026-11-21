import { TIERS, toCardId } from '@soccer-cards/game';
import type { Card, CardId, Tier } from '@soccer-cards/game';
import { backFor, type CardBackProps } from '../cards/card-back.ts';
import type { CardFrontProps } from '../cards/card-front.ts';
import type { CardFace } from '../data/card-face-from-summary.ts';

/** One kind of card the player owns, and how many copies. An unknown card is kept in the save but has no face. */
export type OwnedCard =
	| {
			readonly kind: 'known';
			readonly id: CardId;
			readonly count: number;
			readonly card: Card;
			readonly face: CardFace;
	  }
	| { readonly kind: 'unknown'; readonly id: CardId; readonly count: number };

/** A card the player owns that is in the set, with its face. */
export type KnownCard = Extract<OwnedCard, { readonly kind: 'known' }>;

/** What the card dialog shows. A card with no ratings has no back to turn to. */
export interface CardViewProps {
	readonly front: CardFrontProps;
	readonly back?: CardBackProps;
}

const TIER_RANK: ReadonlyMap<Tier, number> = new Map(TIERS.map((tier, rank) => [tier, rank]));
const API_TIER = { base: 'BASE', rare: 'RARE', legend: 'LEGEND', icon: 'ICON' } as const;
const API_POSITION = {
	GK: 'GOALKEEPER',
	DF: 'DEFENDER',
	MF: 'MIDFIELDER',
	FW: 'FORWARD'
} as const;

function compareOwned(a: OwnedCard, b: OwnedCard): number {
	if (a.kind !== b.kind) return a.kind === 'known' ? -1 : 1;
	if (a.kind === 'known' && b.kind === 'known') {
		const byTier = (TIER_RANK.get(b.card.tier) ?? 0) - (TIER_RANK.get(a.card.tier) ?? 0);
		if (byTier !== 0) return byTier;
		if (a.card.overall !== b.card.overall) return b.card.overall - a.card.overall;
	}
	return a.id.localeCompare(b.id);
}

/**
 * Lists what the player owns: highest tier first, then highest overall, then by id, with
 * cards not in the set last. A count that isn't a whole number above zero is not a card.
 */
export function listOwnedCards(
	collection: Readonly<Record<CardId, number>>,
	cards: readonly Card[],
	faces: ReadonlyMap<CardId, CardFace>
): readonly OwnedCard[] {
	const byId = new Map(cards.map((card) => [card.id, card]));
	const owned: OwnedCard[] = [];
	for (const [key, count] of Object.entries(collection)) {
		const id = toCardId(key);
		if (!Number.isInteger(count) || count < 1) continue;
		const card = byId.get(id);
		const face = faces.get(id);
		owned.push(
			card !== undefined && face !== undefined
				? { kind: 'known', id, count, card, face }
				: { kind: 'unknown', id, count }
		);
	}
	return owned.toSorted(compareOwned);
}

/** Maps a card and its face onto what the card front and back show. */
export function cardViewProps(card: Card, face: CardFace): CardViewProps {
	const front: CardFrontProps = {
		displayName: face.displayName,
		position: API_POSITION[card.position],
		nationalTeamCode: face.nationalTeamCode,
		clubName: face.clubName,
		// The loader calls it the card number. The front prints it as the shirt number.
		shirtNumber: face.cardNumber,
		tier: API_TIER[card.tier],
		cardTitle: face.cardTitle,
		overall: card.overall,
		attack: card.attack,
		defence: card.defence,
		control: card.control,
		...(face.photo && {
			photo: { src: face.photo.src, widthPx: face.photo.widthPx, heightPx: face.photo.heightPx }
		})
	};
	if (face.ratings === undefined) return { front };
	return { front, back: backFor(front, face.ratings, face.photo?.credit, card.id) };
}
