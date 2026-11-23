import { TRAIL_FINISH_COINS, TRAIL_RIGHT_COINS } from '@soccer-cards/game';

/** The words for a save the store refused. */
export const TRAIL_SAVE_NOTICES = {
	'not-saving': "Your coins can't be saved on this device. You can still play.",
	'storage-full': 'This device is full, so your coins were not saved.',
	'changed-in-another-tab': 'The game is open in another tab, so your coins were not saved here.'
} as const;

/** A count and its noun: "1 coin", "2 coins". */
export function plural(count: number, noun: string): string {
	return `${String(count)} ${noun}${count === 1 ? '' : 's'}`;
}

/** The years of a spell. A spell with no end year is the current club. */
export function yearsText(startYear: number, endYear?: number): string {
	if (endYear === undefined) return `${String(startYear)} to now`;
	return endYear === startYear ? String(startYear) : `${String(startYear)} to ${String(endYear)}`;
}

/** What a place says after a check, in words as well as colour. */
export function placeText(
	spell: { readonly startYear: number; readonly endYear?: number },
	isRight: boolean,
	putClub: string
): string {
	const years = yearsText(spell.startYear, spell.endYear);
	return isRight ? `${years} (right place)` : `${years} (you put ${putClub} here)`;
}

/** The line after a check. */
export function checkText(isRight: boolean, playerName: string): string {
	return isRight
		? `Right! That is ${playerName}’s trail. You earned ${plural(TRAIL_RIGHT_COINS, 'coin')}.`
		: `Not this time. Here is ${playerName}’s real trail. Each club shows its years.`;
}

/** What the finish screen says was earned. */
export function finishText(rightCount: number, playerCount: number): string {
	const earned = rightCount * TRAIL_RIGHT_COINS + TRAIL_FINISH_COINS;
	return (
		`You put ${plural(rightCount, 'trail')} right out of ${String(playerCount)}. ` +
		`You earned ${plural(earned, 'coin')}: ${plural(rightCount * TRAIL_RIGHT_COINS, 'coin')} for the trails ` +
		`and ${String(TRAIL_FINISH_COINS)} for finishing.`
	);
}
