import type { Card, CardId, Position } from '../cards.ts';
import type { MatchSide } from '../match.ts';

/** Builds a match side for a test, with each card in the line of its own position. */
export function aMatchSide(cards: readonly Card[], overrides: Partial<MatchSide> = {}): MatchSide {
	const line = (position: Position): CardId[] =>
		cards.filter((card) => card.position === position).map((card) => card.id);
	const lines = { FW: line('FW'), MF: line('MF'), DF: line('DF'), GK: line('GK') };
	return { cards, tactic: 'possession', lineUp: { lines, outOfPosition: [] }, ...overrides };
}
