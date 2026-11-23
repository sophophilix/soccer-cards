import { CONNECTIONS_FINISH_COINS, CONNECTIONS_RIGHT_COINS } from '@soccer-cards/game';
import { plural, yearsText } from '../transfer-trail/trail-words.ts';

/** The words for a save the store refused. */
export const CONNECTIONS_SAVE_NOTICES = {
	'not-saving': "Your coins can't be saved on this device. You can still play.",
	'storage-full': 'This device is full, so your coins were not saved.',
	'changed-in-another-tab': 'The game is open in another tab, so your coins were not saved here.'
} as const;

/** What the finish screen says was earned. */
export function finishText(rightCount: number, questionCount: number): string {
	const earned = rightCount * CONNECTIONS_RIGHT_COINS + CONNECTIONS_FINISH_COINS;
	return (
		`You got ${plural(rightCount, 'answer')} right out of ${String(questionCount)}. ` +
		`You earned ${plural(earned, 'coin')}: ${plural(rightCount * CONNECTIONS_RIGHT_COINS, 'coin')} for the answers ` +
		`and ${String(CONNECTIONS_FINISH_COINS)} for finishing.`
	);
}

/** A club name with one closing full stop, so "Chelsea F.C." doesn't get a second. */
export function endSentence(name: string): string {
	return name.endsWith('.') ? name : `${name}.`;
}

export function rightText(clubName: string): string {
	return `Right! Both played for ${endSentence(clubName)}`;
}

export function wrongText(clubName: string): string {
	return `Not this one. Both played for ${endSentence(clubName)} Their years are below.`;
}

export function questionText(first: string, second: string): string {
	return `Name a club that ${first} and ${second} both played for.`;
}

export function markText(isRight: boolean): string {
	return isRight ? 'right' : 'not this one';
}

export function yearsLine(
	playerName: string,
	clubName: string,
	spell: { readonly startYear: number; readonly endYear?: number }
): string {
	return `${playerName} at ${clubName}: ${yearsText(spell.startYear, spell.endYear)}`;
}
