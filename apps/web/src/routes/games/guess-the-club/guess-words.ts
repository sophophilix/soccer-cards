import { GUESS_FINISH_COINS, GUESS_RIGHT_COINS } from '@soccer-cards/game';
import { endSentence } from '../connections/connections-words.ts';
import { plural, yearsText } from '../transfer-trail/trail-words.ts';

export const HIDDEN_CLUB_TEXT = 'hidden club';

/** The line above a question. */
export function questionText(playerName: string): string {
	return `Which club is hidden in ${playerName}’s career?`;
}

export function rightText(clubName: string): string {
	return `Right! The hidden club was ${endSentence(clubName)}`;
}

export function wrongText(clubName: string): string {
	return `Not this one. The hidden club was ${endSentence(clubName)}`;
}

/** The mark on a club button after an answer, in words. */
export function markText(isRight: boolean): string {
	return isRight ? 'right' : 'not this one';
}

/** A spell's years, games and goals, saying what is not known. */
export function spellFacts(spell: {
	readonly startYear: number;
	readonly endYear?: number;
	readonly games?: number;
	readonly goals?: number;
}): string {
	const years = yearsText(spell.startYear, spell.endYear);
	if (spell.games === undefined) return `${years}, games not known`;
	const games = plural(spell.games, 'game');
	return spell.goals === undefined
		? `${years}, ${games}, goals not known`
		: `${years}, ${games}, ${plural(spell.goals, 'goal')}`;
}

/** What the finish screen says was earned. */
export function finishText(rightCount: number, questionCount: number): string {
	const forAnswers = rightCount * GUESS_RIGHT_COINS;
	const earned = forAnswers + GUESS_FINISH_COINS;
	return (
		`You got ${plural(rightCount, 'answer')} right out of ${String(questionCount)}. ` +
		`You earned ${plural(earned, 'coin')}: ${plural(forAnswers, 'coin')} for the answers ` +
		`and ${String(GUESS_FINISH_COINS)} for finishing.`
	);
}
