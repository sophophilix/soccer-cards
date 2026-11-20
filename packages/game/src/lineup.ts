import { POSITIONS } from './cards.ts';
import type { Card, CardId, CheckedCardSet, Position } from './cards.ts';

/** The number of cards in a team. */
export const TEAM_SIZE = 11;
/** What a card keeps of its worth in a line that isn't its own. */
export const OUT_OF_POSITION_FACTOR = 0.8;
/** What a goalkeeper keeps outside goal, and an outfield card keeps in goal. */
export const WRONG_IN_GOAL_FACTOR = 0.5;

/** How many cards play in each line, for each formation. */
export const FORMATIONS = {
	'4-4-2': { FW: 2, MF: 4, DF: 4, GK: 1 },
	'4-3-3': { FW: 3, MF: 3, DF: 4, GK: 1 },
	'3-5-2': { FW: 2, MF: 5, DF: 3, GK: 1 },
	'5-3-2': { FW: 2, MF: 3, DF: 5, GK: 1 }
} as const satisfies Record<string, Readonly<Record<Position, number>>>;

/** The name of a formation. */
export type Formation = keyof typeof FORMATIONS;

/** A team on the pitch: the cards in each line, and the cards playing out of position. */
export interface LineUp {
	readonly lines: Readonly<Record<Position, readonly CardId[]>>;
	readonly outOfPosition: readonly CardId[];
}

/** The line-up, or the reason the team was refused. */
export type LineUpResult =
	| { readonly ok: true; readonly value: LineUp }
	| { readonly ok: false; readonly reason: 'not-eleven-different-cards' | 'card-not-in-set' };

const LINE_STAT = { FW: 'attack', MF: 'control', DF: 'defence', GK: 'defence' } as const;

// Highest value first. Equal values go by id, so the order the cards came in never matters.
const byHighest =
	(valueOf: (card: Card) => number) =>
	(a: Card, b: Card): number =>
		valueOf(b) - valueOf(a) || (a.id < b.id ? -1 : 1);

/** What a card is worth in a line: its stat for that line, lowered when out of position. */
export function lineWorth(card: Card, line: Position): number {
	const worth = card[LINE_STAT[line]];
	if (card.position === line) {
		return worth;
	}
	const isGoalInvolved = line === 'GK' || card.position === 'GK';
	return worth * (isGoalInvolved ? WRONG_IN_GOAL_FACTOR : OUT_OF_POSITION_FACTOR);
}

/** Places a team of 11 different cards in the lines of a formation. */
export function lineUp(
	team: readonly CardId[],
	cardSet: CheckedCardSet,
	formation: Formation
): LineUpResult {
	const teamIds = new Set(team);
	if (team.length !== TEAM_SIZE || teamIds.size !== TEAM_SIZE) {
		return { ok: false, reason: 'not-eleven-different-cards' };
	}
	const byId = new Map(cardSet.map((card) => [card.id, card]));
	// One card for each id the set holds, so the count is of the team's ids it found.
	const cards = [...teamIds].flatMap((id) => byId.get(id) ?? []);
	if (cards.length !== TEAM_SIZE) {
		return { ok: false, reason: 'card-not-in-set' };
	}
	const need = FORMATIONS[formation];
	const lines: Record<Position, CardId[]> = { FW: [], MF: [], DF: [], GK: [] };
	const outOfPosition: CardId[] = [];
	for (const card of cards.toSorted(byHighest((each) => each.overall))) {
		const hasRoom = lines[card.position].length < need[card.position];
		(hasRoom ? lines[card.position] : outOfPosition).push(card.id);
	}
	const spare = [...outOfPosition];
	for (const line of POSITIONS) {
		lines[line].push(...spare.splice(0, need[line] - lines[line].length));
	}
	return { ok: true, value: { lines, outOfPosition } };
}

/** Picks the strongest cards for a formation, 11 at most, each card once. */
export function bestTeam(cards: readonly Card[], formation: Formation): CardId[] {
	// A map, so a card given twice is picked once.
	const different = [...new Map(cards.map((card) => [card.id, card])).values()];
	const picked = POSITIONS.flatMap((line) =>
		different
			.filter((card) => card.position === line)
			.toSorted(byHighest((card) => lineWorth(card, line)))
			.slice(0, FORMATIONS[formation][line])
	);
	const rest = different
		.filter((card) => !picked.includes(card))
		.toSorted(byHighest((card) => card.overall))
		.slice(0, TEAM_SIZE - picked.length);
	return [...picked, ...rest].map((card) => card.id);
}
