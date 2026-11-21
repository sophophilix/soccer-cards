import { TACTICS, TEAM_SIZE } from '@soccer-cards/game';
import type { Division, Position, Tactic } from '@soccer-cards/game';

/** The name a child sees for each division. */
export const DIVISION_NAMES = {
	'division-4': 'Division 4',
	'division-3': 'Division 3',
	'division-2': 'Division 2',
	'division-1': 'Division 1',
	'champions-league': 'Champions League'
} as const satisfies Record<Division['id'], string>;

/** The name and the one-line tip for each tactic. */
export const TACTIC_WORDS = {
	attack: { name: 'All-out attack', tip: 'More shots, but a thin defence.' },
	counter: { name: 'Counter-attack', tip: 'Sit back, then break fast into the space.' },
	possession: { name: 'Keep the ball', tip: 'Win the midfield so they never get the ball.' },
	defend: { name: 'Park the bus', tip: 'Everyone behind the ball. Hard to score against.' }
} as const satisfies Record<Tactic, { name: string; tip: string }>;

/** What a line is called on the pitch. */
export const LINE_NAMES = {
	FW: 'ATT',
	MF: 'MID',
	DF: 'DEF',
	GK: 'GK'
} as const satisfies Record<Position, string>;

/** The lines from the front to the goal. */
export const LINES: readonly Position[] = ['FW', 'MF', 'DF', 'GK'];

/** What a position is called in words. */
export const POSITION_NAMES = {
	FW: 'Forward',
	MF: 'Midfielder',
	DF: 'Defender',
	GK: 'Goalkeeper'
} as const satisfies Record<Position, string>;

/** The tactic that beats this one, so the player can see what to avoid. */
function loserTo(tactic: Tactic): Tactic {
	const found = (Object.keys(TACTICS) as Tactic[]).find((each) => TACTICS[each].beats === tactic);
	// Each tactic is beaten by exactly one other.
	if (found === undefined) throw new RangeError(`nothing beats ${tactic}`);
	return found;
}

/** The tactic's tip, then what it beats and what beats it. */
export function tacticHint(tactic: Tactic): string {
	return (
		`${TACTIC_WORDS[tactic].tip} Beats ${TACTIC_WORDS[TACTICS[tactic].beats].name}. ` +
		`Loses to ${TACTIC_WORDS[loserTo(tactic)].name}.`
	);
}

/** What the line-up hint says about the players out of their own position. */
export function lineUpHint(outOfPosition: number): string {
	if (outOfPosition === 0) return 'Everyone is in their own position.';
	const who = outOfPosition === 1 ? '1 player is' : `${String(outOfPosition)} players are`;
	return `${who} out of position (dashed outline) and plays worse there. Try another formation.`;
}

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
