import { TIERS, toCardId } from '../cards.ts';
import type { Card, Tier } from '../cards.ts';

/** Builds one card for a test. Pass only the fields the test cares about. */
export function aCard(overrides: Partial<Card> = {}): Card {
	return {
		id: toCardId('card-1'),
		tier: 'base',
		attack: 70,
		defence: 60,
		control: 65,
		...overrides
	};
}

/** Builds a card set for a test, with the given number of cards in each tier. */
export function aCardSet(counts: Readonly<Record<Tier, number>>): Card[] {
	return TIERS.flatMap((tier) =>
		Array.from({ length: counts[tier] }, (_, index) =>
			aCard({ id: toCardId(`${tier}-${String(index + 1)}`), tier })
		)
	);
}
