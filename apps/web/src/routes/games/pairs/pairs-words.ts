import { PAIRS_BOARD_COINS, PAIRS_FEW_TURNS_BONUS } from '@soccer-cards/game';
import type { PairsSize } from '@soccer-cards/game';
import { plural } from '../transfer-trail/trail-words.ts';

/** What the status line says: what to do next, or what the last two cards were. */
export type PairsStatus =
	| { readonly kind: 'first' }
	| { readonly kind: 'second' }
	| { readonly kind: 'match'; readonly name: string }
	| { readonly kind: 'miss' };

export function statusText(status: PairsStatus): string {
	switch (status.kind) {
		case 'first':
			return 'Turn a card.';
		case 'second':
			return 'Now turn a second card.';
		case 'match':
			return `A match: ${status.name}!`;
		case 'miss':
			return 'Not the same. Remember where they are.';
	}
}

/** A card's name for a screen reader. A face-down card is told apart by its place, never by its player. */
export function cardName(
	card:
		| { readonly place: number; readonly state: 'down' }
		| { readonly place: number; readonly state: 'up' | 'matched'; readonly name: string }
): string {
	if (card.state === 'down') return `Face-down card ${String(card.place)}`;
	return card.state === 'matched' ? `${card.name}, matched` : card.name;
}

export function turnsText(turns: number): string {
	return `Turns: ${String(turns)}`;
}

export function pairsText(found: number, total: number): string {
	return `Pairs: ${String(found)} of ${String(total)}`;
}

/** What the finish screen says was earned. */
export function finishText(size: PairsSize, turns: number): string {
	const fewTurns = size * 2;
	const hasBonus = turns <= fewTurns;
	const earned = PAIRS_BOARD_COINS[size] + (hasBonus ? PAIRS_FEW_TURNS_BONUS : 0);
	const used = `You used ${plural(turns, 'turn')}. You earned ${plural(earned, 'coin')}: `;
	const forBoard = `${String(PAIRS_BOARD_COINS[size])} for the board`;
	return hasBonus
		? `${used}${forBoard} and ${String(PAIRS_FEW_TURNS_BONUS)} for finding them in ${String(fewTurns)} turns or fewer.`
		: `${used}${forBoard}. Find them in ${String(fewTurns)} turns or fewer next time for ${String(PAIRS_FEW_TURNS_BONUS)} more.`;
}
