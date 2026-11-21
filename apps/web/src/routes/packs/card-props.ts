import type { Card, Position, Tier } from '@soccer-cards/game';
import { backFor, type CardBackProps } from '../../lib/cards/card-back.ts';
import type { CardFrontProps } from '../../lib/cards/card-front.ts';
import type { CardFace } from '../../lib/data/card-face-from-summary.ts';

// The game names a tier and a position in short form. The card front uses the API's words.
const FRONT_TIERS = {
	base: 'BASE',
	rare: 'RARE',
	legend: 'LEGEND',
	icon: 'ICON'
} as const satisfies Record<Tier, CardFrontProps['tier']>;
const FRONT_POSITIONS = {
	GK: 'GOALKEEPER',
	DF: 'DEFENDER',
	MF: 'MIDFIELDER',
	FW: 'FORWARD'
} as const satisfies Record<Position, CardFrontProps['position']>;

/** What a revealed card shows: its front, and its back when the data has the six ratings. */
export interface CardProps {
	readonly front: CardFrontProps;
	readonly back: CardBackProps | undefined;
}

/** Joins a card's play fields with its face fields. The card number is the shirt number on the front. */
export function cardPropsOf(card: Card, face: CardFace): CardProps {
	const front: CardFrontProps = {
		displayName: face.displayName,
		position: FRONT_POSITIONS[card.position],
		nationalTeamCode: face.nationalTeamCode,
		clubName: face.clubName,
		shirtNumber: face.cardNumber,
		tier: FRONT_TIERS[card.tier],
		cardTitle: face.cardTitle,
		overall: card.overall,
		attack: card.attack,
		defence: card.defence,
		control: card.control,
		...(face.photo !== undefined && {
			photo: { src: face.photo.src, widthPx: face.photo.widthPx, heightPx: face.photo.heightPx }
		})
	};
	const back: CardBackProps | undefined =
		face.ratings === undefined
			? undefined
			: backFor(front, face.ratings, face.photo?.credit, card.id);
	return { front, back };
}
