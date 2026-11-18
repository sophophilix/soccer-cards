import { TIERS, checkCardSet, toCardId } from '../cards.ts';
import type { Card, CheckedCardSet, Tier } from '../cards.ts';

/** Builds one card for a test. Pass only the fields the test cares about. */
export function aCard(overrides: Partial<Card> = {}): Card {
	return {
		id: toCardId('card-1'),
		tier: 'base',
		position: 'MF',
		overall: 65,
		attack: 70,
		defence: 60,
		control: 65,
		...overrides
	};
}

/** The number of cards to build in each tier. A set has no Icon unless a test asks for one. */
type TierCounts = Readonly<Record<Exclude<Tier, 'icon'>, number> & { icon?: number }>;

/** Builds a card set for a test, with the given number of cards in each tier. */
export function aCardSet(counts: TierCounts): Card[] {
	return TIERS.flatMap((tier) =>
		Array.from({ length: counts[tier] ?? 0 }, (_, index) =>
			aCard({ id: toCardId(`${tier}-${String(index + 1)}`), tier })
		)
	);
}

/** Builds a checked card set for a test, with the given number of cards in each tier. */
export function aCheckedCardSet(counts: TierCounts): CheckedCardSet {
	const result = checkCardSet(aCardSet(counts));
	if (!result.ok) {
		throw new RangeError(`a test card set must pass the check: ${result.reason}`);
	}
	return result.value;
}
