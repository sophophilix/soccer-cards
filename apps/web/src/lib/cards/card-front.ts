// Tiers and positions use the player schema's values, so a player's fields pass straight in.
type Tier = 'BASE' | 'RARE' | 'LEGEND' | 'ICON';
type Position = 'GOALKEEPER' | 'DEFENDER' | 'MIDFIELDER' | 'FORWARD';

/** Everything the front of a card shows. A photo's `src` is on the site's own origin. */
export interface CardFrontProps {
	readonly displayName: string;
	readonly position: Position;
	readonly nationalTeamCode: string;
	readonly clubName: string;
	readonly shirtNumber: number;
	readonly tier: Tier;
	readonly cardTitle?: string | undefined;
	readonly overall: number;
	readonly attack: number;
	readonly defence: number;
	readonly control: number;
	readonly photo?: { readonly src: string; readonly widthPx: number; readonly heightPx: number };
}

export const TIER_NAMES = { BASE: 'Base', RARE: 'Rare', LEGEND: 'Legend', ICON: 'Icon' } as const;

const POSITIONS = {
	GOALKEEPER: { code: 'GK', name: 'Goalkeeper' },
	DEFENDER: { code: 'DF', name: 'Defender' },
	MIDFIELDER: { code: 'MF', name: 'Midfielder' },
	FORWARD: { code: 'FW', name: 'Forward' }
} as const satisfies Record<Position, { code: string; name: string }>;

/** The two letters for a position on the card's badge. */
export function positionCode(position: Position): string {
	return POSITIONS[position].code;
}

/** Says what a card shows in one sentence, for a screen reader. */
export function describeCard(card: CardFrontProps): string {
	return (
		`${card.displayName}, ${POSITIONS[card.position].name}, ${TIER_NAMES[card.tier]} card. ` +
		`Overall ${String(card.overall)}. Attack ${String(card.attack)}, ` +
		`defence ${String(card.defence)}, control ${String(card.control)}.`
	);
}
