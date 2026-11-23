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
		? `Right! That is ${playerName}’s trail. You earned 1 coin.`
		: `Not this time. Here is ${playerName}’s real trail. Each club shows its years.`;
}
