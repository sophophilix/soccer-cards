import { yearsText } from '../transfer-trail/trail-words.ts';

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
