import { checkCardSet, createPlayerState, toCardId } from '@soccer-cards/game';
import type { Card, CardId, CheckedCardSet, PlayerState, Position } from '@soccer-cards/game';
import type { MatchPlan } from './play-match.ts';

/** An invented card for the match tests. */
export function aCard(id: string, position: Position): Card {
	const base = { tier: 'base', overall: 70, attack: 70, defence: 60, control: 65 } as const;
	return { ...base, id: toCardId(id), position };
}

const positionAt = (index: number): Position =>
	index === 0 ? 'GK' : index < 5 ? 'DF' : index < 9 ? 'MF' : 'FW';

/** Twenty base cards and the three lucky tiers, so the computer can field 11 from them. */
export function aCardSet(): CheckedCardSet {
	const base = Array.from({ length: 20 }, (_, i) => aCard(`base-${String(i)}`, positionAt(i % 11)));
	const checked = checkCardSet([
		...base,
		{ ...aCard('rare-a', 'FW'), tier: 'rare' },
		{ ...aCard('legend-a', 'MF'), tier: 'legend' },
		{ ...aCard('icon-a', 'GK'), tier: 'icon' }
	]);
	if (!checked.ok) throw new Error('the test card set is invalid');
	return checked.value;
}

/** The player's team: the first 11 base cards. */
export const TEAM: readonly CardId[] = Array.from({ length: 11 }, (_, i) =>
	toCardId(`base-${String(i)}`)
);

/** A player who owns `TEAM` once each. */
export function aState(overrides: Partial<PlayerState> = {}): PlayerState {
	const collection = Object.fromEntries(TEAM.map((id) => [id, 1]));
	return { ...createPlayerState(), collection, ...overrides };
}

/** A plan for `team`. */
export function aPlan(team: readonly CardId[] = TEAM): MatchPlan {
	return { formation: '4-4-2', tactic: 'attack', team };
}
