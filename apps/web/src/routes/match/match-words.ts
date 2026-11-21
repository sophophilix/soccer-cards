import { TEAM_SIZE } from '@soccer-cards/game';
import type { Division } from '@soccer-cards/game';

/** The name a child sees for each division. */
export const DIVISION_NAMES = {
	'division-4': 'Division 4',
	'division-3': 'Division 3',
	'division-2': 'Division 2',
	'division-1': 'Division 1',
	'champions-league': 'Champions League'
} as const satisfies Record<Division['id'], string>;

/** Why the match is locked, and what to do about it. */
export function lockedText(owned: number, freePacks: number): string {
	const extra =
		freePacks > 0
			? ' Open your free packs first.'
			: owned > 0
				? ' Trade your doubles to find new players.'
				: '';
	return `You need ${String(TEAM_SIZE)} different players for a match. You have ${String(owned)}.${extra}`;
}
