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
